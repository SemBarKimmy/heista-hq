package main

import (
	"testing"
	"time"

	"github.com/pquerna/otp/totp"
)

func TestMFAGenerationAndVerification(t *testing.T) {
	email := "test@example.com"
	secret, _, err := GenerateMFASecret(email)
	if err != nil {
		t.Fatalf("Failed to generate MFA secret: %v", err)
	}

	if len(secret) == 0 {
		t.Fatal("Generated secret is empty")
	}

	// Generate a valid token
	token, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	// Verify valid token
	if !VerifyMFAToken(secret, token) {
		t.Error("Failed to verify a valid token")
	}

	// Verify invalid token
	if VerifyMFAToken(secret, "000000") {
		t.Error("Verified an invalid token")
	}
}
