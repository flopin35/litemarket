package com.litemarket.store;

import com.litemarket.plan.PlanMath;
import com.litemarket.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

/** A seller's shop. Lives at {web}/s/{slug}. Holds the seller's plan and AI credit usage. */
@Entity
@Table(name = "stores")
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "owner_id", unique = true)
    private User owner;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, unique = true, length = 60)
    private String slug;

    /** International digits for wa.me links, e.g. 233241234567. */
    @Column(nullable = false, length = 30)
    private String whatsapp;

    @Column(nullable = false, length = 3)
    private String currency = "GHS";

    @Column(length = 1000)
    private String about;

    @Column(length = 9)
    private String accentColor = "#0F9D7A";

    @Column(length = 500)
    private String logoUrl;

    private boolean onlinePayments = true;

    private boolean whatsappOrders = true;

    /** Optional custom address the seller shares (custom domain, link-in-bio...). */
    @Column(length = 300)
    private String publicLink;

    @Column(nullable = false, length = 20)
    private String planCode = PlanMath.FREE;

    private Instant planExpiresAt;

    private int aiCreditsUsed;

    private LocalDate aiPeriodStart;

    /** Split-payment destinations, set by the admin. Empty = platform collects and pays out. */
    @Column(length = 64)
    private String flutterwaveSubaccount;

    @Column(length = 64)
    private String paystackSubaccount;

    @Column(length = 64)
    private String stripeAccount;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getWhatsapp() { return whatsapp; }
    public void setWhatsapp(String whatsapp) { this.whatsapp = whatsapp; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }
    public String getAccentColor() { return accentColor; }
    public void setAccentColor(String accentColor) { this.accentColor = accentColor; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public boolean isOnlinePayments() { return onlinePayments; }
    public void setOnlinePayments(boolean onlinePayments) { this.onlinePayments = onlinePayments; }
    public boolean isWhatsappOrders() { return whatsappOrders; }
    public void setWhatsappOrders(boolean whatsappOrders) { this.whatsappOrders = whatsappOrders; }
    public String getPublicLink() { return publicLink; }
    public void setPublicLink(String publicLink) { this.publicLink = publicLink; }
    public String getPlanCode() { return planCode; }
    public void setPlanCode(String planCode) { this.planCode = planCode; }
    public Instant getPlanExpiresAt() { return planExpiresAt; }
    public void setPlanExpiresAt(Instant planExpiresAt) { this.planExpiresAt = planExpiresAt; }
    public int getAiCreditsUsed() { return aiCreditsUsed; }
    public void setAiCreditsUsed(int aiCreditsUsed) { this.aiCreditsUsed = aiCreditsUsed; }
    public LocalDate getAiPeriodStart() { return aiPeriodStart; }
    public void setAiPeriodStart(LocalDate aiPeriodStart) { this.aiPeriodStart = aiPeriodStart; }
    public String getFlutterwaveSubaccount() { return flutterwaveSubaccount; }
    public void setFlutterwaveSubaccount(String v) { this.flutterwaveSubaccount = v; }
    public String getPaystackSubaccount() { return paystackSubaccount; }
    public void setPaystackSubaccount(String v) { this.paystackSubaccount = v; }
    public String getStripeAccount() { return stripeAccount; }
    public void setStripeAccount(String v) { this.stripeAccount = v; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
