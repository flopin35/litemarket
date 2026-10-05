package com.litemarket.flow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Boots the whole API on an in-memory database and walks the main journey:
 * seller signs up, adds products, a customer orders on WhatsApp and pays online (demo gateway),
 * and the seller upgrades their plan. Run with: mvn test
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:flow;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.demo.seed=false",
        "app.payments.demo-mode=true",
        "app.storage.upload-dir=target/test-uploads"
})
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class FullFlowTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    private JsonNode call(String method, String url, String token, String body, int expectedStatus) throws Exception {
        var req = method.equals("GET") ? get(url) : post(url);
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        if (body != null) req = req.contentType(MediaType.APPLICATION_JSON).content(body);
        MvcResult r = mvc.perform(req).andExpect(status().is(expectedStatus)).andReturn();
        String text = r.getResponse().getContentAsString();
        return text.isEmpty() ? json.createObjectNode() : json.readTree(text);
    }

    @Test
    @Order(1)
    void sellerCustomerAndPaymentJourney() throws Exception {
        // Public config works without logging in
        JsonNode config = call("GET", "/api/config", null, null, 200);
        assertTrue(config.path("plans").size() >= 1);

        // 1. Seller signs up (first account becomes admin)
        JsonNode auth = call("POST", "/api/auth/signup", null, """
                {"email":"ama@example.com","password":"supersecret1","storeName":"Ama's Kitchen","whatsapp":"024 123 4567"}
                """, 200);
        String token = auth.path("accessToken").asText();
        assertEquals("ADMIN", auth.path("me").path("role").asText());
        assertEquals("amas-kitchen", auth.path("me").path("store").path("slug").asText());
        assertEquals("233241234567", auth.path("me").path("store").path("whatsapp").asText());

        // Protected routes need the token
        call("GET", "/api/products", null, null, 401);
        call("POST", "/api/auth/login", null, """
                {"email":"ama@example.com","password":"wrong-password"}""", 401);

        // 2. Seller adds products
        JsonNode jollof = call("POST", "/api/products", token, """
                {"name":"Jollof Rice","price":45,"category":"Food","description":"Smoky","inStock":true,"stockQty":10,"featured":true}
                """, 200);
        long jollofId = jollof.path("id").asLong();
        call("POST", "/api/products", token, """
                {"name":"Sobolo","price":12.5,"category":"Drinks","inStock":true}""", 200);
        assertEquals(2, call("GET", "/api/products", token, null, 200).size());

        // 3. Customer sees the shop
        JsonNode shop = call("GET", "/api/shops/amas-kitchen", null, null, 200);
        assertEquals(2, shop.path("products").size());
        assertTrue(shop.path("providers").toString().contains("demo"));

        // 4. Customer orders on WhatsApp: order is saved and a wa.me link comes back
        JsonNode wa = call("POST", "/api/shops/amas-kitchen/orders", null, """
                {"items":[{"productId":%d,"quantity":2}],
                 "customer":{"name":"Kofi","phone":"0201234567","address":"Osu","note":"Extra shito"}}
                """.formatted(jollofId), 200);
        assertEquals(0, wa.path("total").decimalValue().compareTo(new java.math.BigDecimal("90")));
        assertTrue(wa.path("whatsappUrl").asText().startsWith("https://wa.me/233241234567?text="));

        // 5. Customer pays online with the demo gateway
        JsonNode checkout = call("POST", "/api/shops/amas-kitchen/checkout", null, """
                {"items":[{"productId":%d,"quantity":1}],
                 "customer":{"name":"Efua","phone":"0241112222","email":"efua@example.com","address":"East Legon"},
                 "provider":"demo"}
                """.formatted(jollofId), 200);
        String ref = checkout.path("reference").asText();
        assertTrue(checkout.path("checkoutUrl").asText().contains("/pay/demo?reference=" + ref));
        assertEquals("PENDING", call("POST", "/api/payments/verify", null,
                "{\"reference\":\"" + ref + "\"}", 200).path("status").asText());
        JsonNode paid = call("POST", "/api/payments/demo/" + ref + "/complete", null, null, 200);
        assertEquals("SUCCESS", paid.path("status").asText());
        assertTrue(paid.path("whatsappUrl").asText().startsWith("https://wa.me/"));
        // Paying twice delivers once
        assertEquals("SUCCESS", call("POST", "/api/payments/demo/" + ref + "/complete", null, null, 200)
                .path("status").asText());

        // Stock went down by 1 (paid) and the dashboard counts the sale
        JsonNode products = call("GET", "/api/products", token, null, 200);
        for (JsonNode p : products) {
            if (p.path("id").asLong() == jollofId) assertEquals(9, p.path("stockQty").asInt());
        }
        JsonNode dash = call("GET", "/api/dashboard", token, null, 200);
        assertEquals(1, dash.path("paidOrders").asInt());
        assertEquals(1, dash.path("newOrders").asInt());
        assertEquals(2, dash.path("totalOrders").asInt());

        // 6. Seller upgrades with the demo gateway
        JsonNode sub = call("POST", "/api/billing/checkout", token,
                "{\"planCode\":\"MONTHLY\",\"provider\":\"demo\"}", 200);
        JsonNode subPaid = call("POST", "/api/payments/demo/" + sub.path("reference").asText() + "/complete", null, null, 200);
        assertEquals("SUCCESS", subPaid.path("status").asText());
        JsonNode me = call("GET", "/api/me", token, null, 200);
        assertTrue(me.path("plan").path("premium").asBoolean());
        assertEquals("MONTHLY", me.path("plan").path("code").asText());

        // 7. Admin endpoints work for the admin
        assertEquals(1, call("GET", "/api/admin/sellers", token, null, 200).size());
        assertTrue(call("GET", "/api/admin/overview", token, null, 200).path("orders").asInt() >= 2);

        // Webhooks for disabled gateways are refused
        call("POST", "/api/webhooks/paystack", null, "{}", 404);
    }

    @Test
    @Order(2)
    void freePlanLimitAndSecondSellerIsNotAdmin() throws Exception {
        JsonNode first = call("POST", "/api/auth/signup", null, """
                {"email":"owner@example.com","password":"supersecret1","storeName":"Owner Shop","whatsapp":"0241234500"}
                """, 200);
        JsonNode second = call("POST", "/api/auth/signup", null, """
                {"email":"kofi@example.com","password":"supersecret1","storeName":"Kofi Kicks","whatsapp":"0241234599"}
                """, 200);
        assertEquals("SELLER", second.path("me").path("role").asText());
        String token = second.path("accessToken").asText();
        call("GET", "/api/admin/overview", token, null, 403);

        for (int i = 0; i < 5; i++) {
            call("POST", "/api/products", token, "{\"name\":\"Shoe " + i + "\",\"price\":100,\"inStock\":true}", 200);
        }
        JsonNode blocked = call("POST", "/api/products", token, "{\"name\":\"Shoe 6\",\"price\":100,\"inStock\":true}", 402);
        assertEquals("PLAN_LIMIT", blocked.path("error").asText());

        // Validation errors are readable
        JsonNode bad = call("POST", "/api/auth/signup", null, "{\"email\":\"nope\",\"password\":\"x\"}", 400);
        assertEquals("VALIDATION", bad.path("error").asText());
        assertTrue(first.path("accessToken").asText().length() > 20);
    }
}
