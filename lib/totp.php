<?php
/**
 * Nexa HR & Payroll — Minimal TOTP Library (RFC 6238)
 */
class TOTP {
    private static $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a new 16-character base32 secret
     */
    public static function generateSecret($length = 16) {
        $secret = '';
        if (function_exists('random_bytes')) {
            $random = random_bytes($length);
        } elseif (function_exists('openssl_random_pseudo_bytes')) {
            $random = openssl_random_pseudo_bytes($length);
        } else {
            $random = '';
            for ($i = 0; $i < $length; $i++) $random .= chr(mt_rand(0, 255));
        }
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::$base32Chars[ord($random[$i]) & 31];
        }
        return $secret;
    }

    /**
     * Verify a 6-digit code against a secret
     */
    public static function verifyCode($secret, $code, $discrepancy = 1) {
        $currentTimeSlice = floor(time() / 30);
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            if (self::calculateCode($secret, $currentTimeSlice + $i) === $code) {
                return true;
            }
        }
        return false;
    }

    private static function calculateCode($secret, $timeSlice) {
        $secretKey = self::base32Decode($secret);
        $time = pack('N*', 0) . pack('N*', $timeSlice);
        $hmac = hash_hmac('sha1', $time, $secretKey, true);
        $offset = ord($hmac[19]) & 0xf;
        $hashPart = (
            (ord($hmac[$offset + 0]) & 0x7f) << 24 |
            (ord($hmac[$offset + 1]) & 0xff) << 16 |
            (ord($hmac[$offset + 2]) & 0xff) << 8 |
            (ord($hmac[$offset + 3]) & 0xff)
        );
        $otp = $hashPart % pow(10, 6);
        return str_pad((string)$otp, 6, '0', STR_PAD_LEFT);
    }

    private static function base32Decode($base32) {
        $base32 = strtoupper($base32);
        if (!preg_match('/^[' . self::$base32Chars . ']+$/', $base32)) return '';
        
        $data = '';
        $n = 0;
        $j = 0;
        foreach (str_split($base32) as $char) {
            $n = ($n << 5) | strpos(self::$base32Chars, $char);
            $j += 5;
            if ($j >= 8) {
                $j -= 8;
                $data .= chr(($n >> $j) & 0xFF);
            }
        }
        return $data;
    }
}
