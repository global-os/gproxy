FROM docker.io/library/golang:1.24-bookworm AS builder
WORKDIR /app
COPY go.mod main.go ./
# Fetch latest tls-client, generate go.sum, build a static binary.
RUN go get github.com/bogdanfinn/tls-client@latest && \
    go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o sidecar .

FROM docker.io/library/debian:bookworm-slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/sidecar /sidecar
EXPOSE 8080
CMD ["/sidecar"]
