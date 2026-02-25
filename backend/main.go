package main

import (
	"fmt"
	"time"

	"github.com/pquerna/otp/totp"
)

// GenerateMFASecret generates a new TOTP secret for a user
func GenerateMFASecret(userEmail string) (string, string, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "HeistaHQ",
		AccountName: userEmail,
	})
	if err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

// VerifyMFAToken verifies a TOTP token against a secret
func VerifyMFAToken(secret, token string) bool {
	return totp.Validate(token, secret)
}

func main() {
	email := "user@heista.com"
	secret, url, _ := GenerateMFASecret(email)
	fmt.Printf("Secret: %s\n", secret)
	fmt.Printf("URL: %s\n", url)

	// Example verification (would usually come from user input)
	token, _ := totp.GenerateCode(secret, time.Now())
	isValid := VerifyMFAToken(secret, token)
	fmt.Printf("Token %s is valid: %v\n", token, isValid)
}
