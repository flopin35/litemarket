package com.litemarket.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.litemarket.ai.AiContext.Prepared;
import com.litemarket.ai.AiDtos.BroadcastRequest;
import com.litemarket.ai.AiDtos.ProductWriterRequest;
import com.litemarket.ai.AiDtos.ReplyRequest;
import com.litemarket.ai.AiDtos.UsageView;
import com.litemarket.auth.AuthUser;
import com.litemarket.common.ApiException;
import com.litemarket.plan.PlanService;
import com.litemarket.shop.ShopDtos.AssistantRequest;
import com.litemarket.store.Store;
import com.litemarket.store.StoreService;
import org.springframework.stereotype.Service;

/**
 * AI features. Each call uses one AI credit from the seller's monthly allowance; the credit is
 * returned if the AI service fails.
 */
@Service
public class AiService {

    private final AiClient client;
    private final AiContext context;
    private final ObjectMapper mapper;
    private final StoreService stores;
    private final PlanService plans;

    public AiService(AiClient client, AiContext context, ObjectMapper mapper, StoreService stores, PlanService plans) {
        this.client = client;
        this.context = context;
        this.mapper = mapper;
        this.stores = stores;
        this.plans = plans;
    }

    public UsageView usage(AuthUser me) {
        Store s = stores.requireStore(me.id());
        return new UsageView(plans.aiUsed(s), plans.aiLimit(s), plans.isPremium(s));
    }

    public JsonNode productWriter(AuthUser me, ProductWriterRequest req) {
        return metered(context.productWriter(me.id(), req), "/v1/product-writer");
    }

    public JsonNode replyDrafts(AuthUser me, ReplyRequest req) {
        return metered(context.replyDrafts(me.id(), req), "/v1/reply-drafts");
    }

    public JsonNode broadcast(AuthUser me, BroadcastRequest req) {
        return metered(context.broadcast(me.id(), req), "/v1/broadcast");
    }

    public JsonNode coach(AuthUser me) {
        return metered(context.coach(me.id()), "/v1/coach");
    }

    /** Customer chat on the shop page. Never shows an error to a shopper; falls back politely. */
    public JsonNode shopChat(String slug, AssistantRequest req) {
        Prepared p = context.shopChat(slug, req);
        try {
            return metered(p, "/v1/shop-chat");
        } catch (ApiException e) {
            ObjectNode fallback = mapper.createObjectNode();
            fallback.put("reply", p.whatsappOrders()
                    ? "Our assistant is taking a short break. Add what you like to your cart and tap \"Order on WhatsApp\". We'll help you there!"
                    : "Our assistant is taking a short break. Browse the products and check out when you're ready!");
            fallback.putArray("suggestions");
            fallback.put("engine", "none");
            return fallback;
        }
    }

    private JsonNode metered(Prepared p, String path) {
        plans.consumeAiCredit(p.storeId());
        try {
            return client.post(path, p.body());
        } catch (ApiException e) {
            plans.refundAiCredit(p.storeId());
            throw e;
        }
    }
}
