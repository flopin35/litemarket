package com.litemarket.mail;

import com.litemarket.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends plain-text emails in the background. When no SMTP server is configured
 * (MAIL_HOST empty) the email is written to the log instead, so local setups still work.
 */
@Component
public class Mailer {

    private static final Logger log = LoggerFactory.getLogger(Mailer.class);

    private final ObjectProvider<JavaMailSender> sender;
    private final AppProperties props;
    private final boolean configured;

    public Mailer(ObjectProvider<JavaMailSender> sender, AppProperties props, Environment env) {
        this.sender = sender;
        this.props = props;
        this.configured = !env.getProperty("spring.mail.host", "").isBlank();
    }

    public boolean enabled() {
        return configured && sender.getIfAvailable() != null;
    }

    public void send(String to, String subject, String body) {
        JavaMailSender s = enabled() ? sender.getIfAvailable() : null;
        if (s == null) {
            log.info("[email not configured] To: {} | Subject: {}\n{}", to, subject, body);
            return;
        }
        Thread.startVirtualThread(() -> {
            try {
                SimpleMailMessage m = new SimpleMailMessage();
                m.setFrom(props.mail().from());
                m.setTo(to);
                m.setSubject(subject);
                m.setText(body);
                s.send(m);
            } catch (Exception e) {
                log.warn("Could not send email to {}: {}", to, e.getMessage());
            }
        });
    }
}
