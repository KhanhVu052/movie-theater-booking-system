package com.example.cinema.payment;

import com.example.cinema.payment.config.VnPayUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class VnPayUtilTest {

    private final String secretKey = "DEMO_SECRET_KEY_12345";

    @Test
    @DisplayName("G4-05: Non-vnp_ query parameters (e.g. utm_source, fbclid) do not invalidate HMAC signature")
    void nonVnpParameters_doNotAffectSignatureVerification() {
        Map<String, String> params = new HashMap<>();
        params.put("vnp_Amount", "10000000");
        params.put("vnp_Command", "pay");
        params.put("vnp_OrderInfo", "Thanh toan ve xem phim");
        params.put("vnp_ResponseCode", "00");
        params.put("vnp_TxnRef", "TXN123456");

        String paymentUrl = VnPayUtil.buildPaymentUrl(params, "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html", secretKey);
        assertThat(paymentUrl).contains("vnp_SecureHash=");

        // Extract vnp_SecureHash from the generated URL
        String secureHash = paymentUrl.substring(paymentUrl.indexOf("vnp_SecureHash=") + "vnp_SecureHash=".length());
        params.put("vnp_SecureHash", secureHash);

        // Verify without extra params -> Must pass
        assertThat(VnPayUtil.verifySignature(params, secretKey)).isTrue();

        // Inject third-party tracking params (e.g. Google Ads, Facebook, UTM tracking)
        Map<String, String> pollutedParams = new HashMap<>(params);
        pollutedParams.put("utm_source", "facebook");
        pollutedParams.put("utm_campaign", "cinema_promo");
        pollutedParams.put("fbclid", "IwAR123456789abcdef");
        pollutedParams.put("extra_tracking_id", "trk_9999");

        // Verify with extra params -> Must STILL pass because non-vnp_ params are filtered out!
        assertThat(VnPayUtil.verifySignature(pollutedParams, secretKey)).isTrue();

        // If a real vnp_ param is tampered with -> Must fail
        Map<String, String> tamperedParams = new HashMap<>(pollutedParams);
        tamperedParams.put("vnp_Amount", "20000000");
        assertThat(VnPayUtil.verifySignature(tamperedParams, secretKey)).isFalse();
    }

    @Test
    @DisplayName("G4-05: verifySignature handles null and missing hash securely")
    void verifySignature_handlesEdgeCasesSecurely() {
        assertThat(VnPayUtil.verifySignature(null, secretKey)).isFalse();
        assertThat(VnPayUtil.verifySignature(Map.of(), secretKey)).isFalse();
        assertThat(VnPayUtil.verifySignature(Map.of("vnp_TxnRef", "123"), secretKey)).isFalse();
        assertThat(VnPayUtil.verifySignature(Map.of("vnp_SecureHash", ""), secretKey)).isFalse();
    }

    @Test
    @DisplayName("Verify constant-time HMAC signature comparison against timing attacks")
    void constantTimeEquals_againstTimingAttacks() {
        String hash = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";
        assertThat(VnPayUtil.constantTimeEquals(hash, hash)).isTrue();
        assertThat(VnPayUtil.constantTimeEquals(hash, " " + hash.toUpperCase() + " ")).isTrue();
        assertThat(VnPayUtil.constantTimeEquals(hash, hash.substring(0, hash.length() - 1) + "1")).isFalse();
        assertThat(VnPayUtil.constantTimeEquals(null, hash)).isFalse();
        assertThat(VnPayUtil.constantTimeEquals(hash, null)).isFalse();
    }
}

