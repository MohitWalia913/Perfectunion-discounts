# Discount - Delete

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "version": "1.0.0",
    "title": "discount"
  },
  "servers": [
    {
      "url": "https://api-prod.treez.io/service/discount"
    }
  ],
  "paths": {
    "/{ver}/{id}": {
      "delete": {
        "description": "",
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {}
            }
          },
          "204": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {}
                },
                "examples": {
                  "No Content": {
                    "summary": "No Content",
                    "value": "{}"
                  }
                }
              }
            },
            "description": "No Content"
          }
        },
        "parameters": [
          {
            "in": "path",
            "name": "ver",
            "schema": {
              "type": "string",
              "default": "v3"
            },
            "required": true
          },
          {
            "in": "path",
            "name": "id",
            "schema": {
              "type": "string"
            },
            "required": true
          }
        ],
        "summary": "Copy of Copy of ",
        "operationId": "delete_ver-id"
      }
    }
  },
  "x-readme": {
    "explorer-enabled": true,
    "proxy-enabled": true
  }
}
```