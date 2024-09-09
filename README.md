Essa aplicação foi realizada para testar um serviço de subscriptions utilizando websocket em vez do padrão de SSE com graphql-yoga.

# App

1. Rode a aplicação no devcontainer utilizando vscode
2. Instale as dependências `yarn`
3. Inicie o servidor `yarn dev`

# API

Para testes foi criado um serviço simples

1. Instale as dependências `yarn`
2. Inicie o servidor `yarn dev`

Para testar com recursos de terminal execute:

```sh
yarn wscat -c ws://localhost:4000/api/v1/graphql -s graphql-transport-ws
```

### It works!