package com.litemarket.payment.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.net.http.HttpRequest;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;

/** Records requests and replies with queued canned responses instead of calling the internet. */
class FakeHttp extends HttpJson {

    record Sent(String method, String url, String authorization, String body) {}

    final List<Sent> sent = new ArrayList<>();
    private final Deque<Response> replies = new ArrayDeque<>();

    FakeHttp() {
        super(new ObjectMapper());
    }

    FakeHttp reply(int status, String json) {
        replies.add(new Response(status, parse(json), json));
        return this;
    }

    @Override
    protected Response send(HttpRequest request) {
        sent.add(new Sent(request.method(), request.uri().toString(),
                request.headers().firstValue("Authorization").orElse(null), bodyOf(request)));
        if (replies.isEmpty()) throw new GatewayException("no canned reply");
        return replies.removeFirst();
    }

    Sent last() {
        return sent.get(sent.size() - 1);
    }

    static String bodyOf(HttpRequest req) {
        if (req.bodyPublisher().isEmpty()) return "";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        CountDownLatch done = new CountDownLatch(1);
        req.bodyPublisher().get().subscribe(new Flow.Subscriber<ByteBuffer>() {
            @Override public void onSubscribe(Flow.Subscription s) { s.request(Long.MAX_VALUE); }
            @Override public void onNext(ByteBuffer b) {
                byte[] a = new byte[b.remaining()];
                b.get(a);
                out.write(a, 0, a.length);
            }
            @Override public void onError(Throwable t) { done.countDown(); }
            @Override public void onComplete() { done.countDown(); }
        });
        try {
            done.await(2, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return out.toString(StandardCharsets.UTF_8);
    }
}
