package com.litemarket.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.litemarket.ai.AiDtos.BroadcastRequest;
import com.litemarket.ai.AiDtos.ProductWriterRequest;
import com.litemarket.ai.AiDtos.ReplyRequest;
import com.litemarket.ai.AiDtos.UsageView;
import com.litemarket.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** AI tools for sellers. Each call uses one AI credit. */
@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService ai;

    public AiController(AiService ai) {
        this.ai = ai;
    }

    @GetMapping("/usage")
    public UsageView usage(@AuthenticationPrincipal AuthUser me) {
        return ai.usage(me);
    }

    @PostMapping("/product-writer")
    public JsonNode productWriter(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ProductWriterRequest req) {
        return ai.productWriter(me, req);
    }

    @PostMapping("/reply-drafts")
    public JsonNode replyDrafts(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ReplyRequest req) {
        return ai.replyDrafts(me, req);
    }

    @PostMapping("/broadcast")
    public JsonNode broadcast(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody BroadcastRequest req) {
        return ai.broadcast(me, req);
    }

    @PostMapping("/coach")
    public JsonNode coach(@AuthenticationPrincipal AuthUser me) {
        return ai.coach(me);
    }
}
