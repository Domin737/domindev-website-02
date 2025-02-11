#!/bin/bash

echo "=== Test zabezpieczeń API ==="
echo "Uruchamianie testów..."
echo

# Test 1: Podstawowe żądanie
echo "Test 1: Poprawne żądanie"
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Test wiadomości"}' \
  -w "\nKod odpowiedzi: %{http_code}\n"
echo

# Test 2: Rate limiting
echo "Test 2: Rate limiting (wysyłanie wielu żądań)"
for i in {1..12}; do
  echo "Żądanie $i z 12..."
  curl -s -X POST http://localhost:3001/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"Test rate limiting"}' \
    -w "Kod odpowiedzi: %{http_code}\n"
  sleep 1
done
echo

# Test 3: Walidacja danych - pusta wiadomość
echo "Test 3: Walidacja - pusta wiadomość"
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":""}' \
  -w "\nKod odpowiedzi: %{http_code}\n"
echo

# Test 4: Walidacja danych - zbyt długa wiadomość
echo "Test 4: Walidacja - zbyt długa wiadomość"
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"$(printf 'a%.0s' {1..1001})\"}" \
  -w "\nKod odpowiedzi: %{http_code}\n"
echo

# Test 5: Sprawdzenie limitów dla /update-config
echo "Test 5: Rate limiting dla /update-config"
for i in {1..5}; do
  echo "Żądanie $i z 5..."
  curl -s -X POST http://localhost:3001/update-config \
    -H "Content-Type: application/json" \
    -d '{"temperature":0.5}' \
    -w "Kod odpowiedzi: %{http_code}\n"
  sleep 1
done
echo

# Test 6: Walidacja danych dla /update-config
echo "Test 6: Walidacja - nieprawidłowa temperatura"
curl -X POST http://localhost:3001/update-config \
  -H "Content-Type: application/json" \
  -d '{"temperature":2}' \
  -w "\nKod odpowiedzi: %{http_code}\n"
echo

echo "=== Testy zakończone ==="
