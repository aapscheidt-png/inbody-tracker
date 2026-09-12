# InBody Tracker

PWA responsivo, mobile-first, para acompanhar bioimpedância e composição corporal.

## Privacy Architecture V2

O código-fonte atual não contém medições pessoais, nome, altura, peso de referência ou outros dados de saúde pré-carregados. Os dados são importados pelo usuário e ficam armazenados somente no `localStorage` do navegador/aparelho.

O backup JSON exportado pelo próprio app pode conter dados pessoais e deve ser tratado como arquivo privado. Ele não deve ser commitado neste repositório.

## Funcionalidades

- Dashboard de peso, IMC, gordura corporal e massa muscular.
- Histórico de medições.
- Gráficos de evolução.
- Comparação entre bioimpedâncias.
- Composição corporal e análise segmentar quando esses campos existirem no arquivo importado.
- Cadastro manual de novas medições.
- Importação e exportação de backup JSON.
- Armazenamento local no aparelho.
- PWA instalável no iPhone/Android.
- Sem dependências externas.

## Primeira utilização

Abra o app, acesse o menu `⋯` e importe um backup privado JSON ou adicione a primeira medição manualmente.

## Importante sobre este repositório

Este repositório deve permanecer **privado**. Uma versão anterior do projeto continha um histórico pessoal pré-carregado em commits antigos. A versão atual remove esses dados do código em execução, mas tornar o repositório público exigiria antes uma limpeza/recriação do histórico Git.

## Rodar localmente

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Publicação

O site pode ser publicado usando somente a versão atual sanitizada. O repositório-fonte deve continuar privado até que o histórico Git antigo seja eliminado.
