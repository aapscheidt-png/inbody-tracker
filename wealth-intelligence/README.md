# Wealth Intelligence AI — V1.0

Aplicativo independente de inteligência patrimonial com interface mobile-first/PWA para iPhone.

## Funcionalidades
- Visão consolidada da carteira, distribuição por classe, custo e variação não realizada.
- Cadastro, edição e exclusão de ativos BRL e USD; conversão manual de moeda.
- Simulações Monte Carlo (1.000 trajetórias independentes), percentis P10/P50/P90, chance estimada de atingir meta e valor deflacionado.
- Diagnósticos explicáveis de concentração, diversificação, atualização de preços e completude histórica.
- Séries históricas manuais de patrimônio e fluxos de aportes líquidos.
- Exportação de backup JSON, importação validada e CSV de posições.
- PWA com suporte offline após primeira visita.

## Privacidade e dados
A versão publicada contém **apenas uma carteira de demonstração fictícia**, identificada no app. O projeto não tem integrações com corretoras, scripts externos, API de cotações nem telemetry. A carteira inserida pelo visitante é salva no localStorage do próprio navegador e **não é sincronizada nem criptografada**. Backups exportados precisam de armazenamento seguro. Não é adequado para armazenar senhas ou números de conta.

## Método e limitações financeiras
- Valor de posição: quantidade x preço unitário x câmbio manual vigente. Custo médio em USD convertido ao mesmo câmbio do dia, logo **não calcula o retorno cambial histórico corretamente**; o retorno exibido é indicativo.
- Rentabilidade patrimonial de cada intervalo: (patrimônio final - fluxo líquido informado no intervalo) / patrimônio inicial - 1. Hipótese aproximada de fluxo no final do período; **não equivale a TWR auditado ou XIRR**.
- Simulação mensal: retornos lognormais independentes com retorno aritmético anualizado aproximado e volatilidade anual constante, aportes ao fim do mês, aleatoriedade determinística para reprodução. 1.000 caminhos; P10/P50/P90 não são limites de confiança; chance é fração de caminhos acima da meta no horizonte.
- Premissas **não calibradas** por retornos históricos das posições; não considera custos, impostos, defaults, correlação entre classes, risco de liquidez nem mudanças estruturais de mercado.
- Não há cotações em tempo real, IA generativa, ordens de compra/venda ou recomendação automática de ativos.

## Executar
```bash
node server.js
# http://localhost:3000
```
Ou construir o Dockerfile com a pasta `wealth-intelligence` como raiz de build.

## Desenvolvimento futuro
Autenticação passkey/Face ID vinculada a conta, backend isolado, histórico de transações datadas, TWR e XIRR precisos, integração com provedores autorizados, custos/tributação, benchmark CDI/IPCA e análise de risco com covariância.

## Isolamento
O código foi criado em `wealth-intelligence-v1` de `aapscheidt-png/inbody-tracker`, exclusivamente por limitação de criação de novos repositórios no conector. **A branch main do Health Tracker não foi alterada**. Serviço Railway dedicado usa a raiz `/wealth-intelligence`.
