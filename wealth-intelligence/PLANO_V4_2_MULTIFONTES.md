# Wealth Intelligence V4.2 — Alimentação multiorigem (proposta validável)

**Status:** desenho de produto e contrato de dados, ainda sem alterações executáveis na interface. A V3, a V4.1 implantada no Vercel e o GitHub Pages anterior permanecem intactos.

## Objetivo

Substituir a planilha mestra obrigatória por atualizações independentes de posições e movimentos. A experiência padrão começa com uma carteira **vazia**, sem qualquer saldo inventado. Exemplos podem existir apenas em um modo explicitamente escolhido e rotulado, sem misturar com dados pessoais.

### Tela inicial de cadastro

**Atualizar meu patrimônio** apresenta:
1. XP Investimentos: foto/captura de tela, PDF, CSV ou Excel.
2. Proventos: extrato exportado com período, ativo, tipo, data do crédito, valor bruto/líquido e moeda.
3. Previdência: adicionar/editar plano, instituição, data de referência e saldo informado.
4. Internacional e outros: posição, moeda e referência datada.
5. Revisão e aplicação: sempre mostrar diferenças, fontes, datas, totais e conflitos; salvar somente após aprovação explícita.

Um arquivo mais estruturado (CSV/XLSX/PDF textual) deve ter prioridade sobre screenshot quando ambos estão disponíveis, pois oferece melhor auditabilidade. **A extração de prints não é confiável até que uma amostra real seja mapeada e validada.**

## Contrato básico de dados (proposto)

Cada posição:
- `sourceId` (XP, outra instituição ou manual), `accountId` (sem CPF/conta em claro no ID), `instrumentKey`, `assetType`, `currency`;
- `quantity` e `unitPrice`, **ou** `balanceOnly` quando existe apenas valor consolidado;
- `valuationDate` e `ingestedAt` como campos diferentes; `ingestedAt` nunca deve substituir uma referência financeira ausente;
- `evidenceType` (screen, statement, manual, xlsx, csv), `status` (extracted, reviewed, confirmed, conflicting) e resumo de origem;
- custo de aquisição `unknown` por padrão em posições de extrato que não declaram custo.

Cada provento:
- instituição/conta, identificador do ativo, tipo (dividendo/JCP/rendimento/amortização/etc.), moeda, data de crédito, valor e identificação de origem;
- evitar duplicatas por chave composta e hash do arquivo; proventos **não alteram automaticamente** o valor patrimonial nem se tornam aportes externos;
- não confundir competência, data ex, data de pagamento, data de lançamento e recebimento comprovado.

Cada registro manual de previdência:
- nome do plano, instituição, saldo em BRL, data de referência e fonte `manual`;
- se o usuário informar somente o saldo, não presumir cotas, custo, aporte ou rentabilidade;
- adicionar novo registro histórico apenas para o plano identificado; manter dados de instituições diferentes separados.

## Atualização e reconciliação

- A fonte mais recente **do mesmo investimento e instituição** substitui apenas a posição corrente daquele investimento, preservando o histórico anterior.
- Captura de tela com total da XP e capturas dos ativos individuais não podem ser somadas entre si; total consolidado é conferência, não posição adicional.
- Fonte e data divergentes: exibir pendência antes de confirmar. Não apagar posições de outras instituições quando chegar uma atualização parcial da XP.
- Identificação ambígua do mesmo ativo: solicitar revisão de correspondência, não duplicar.
- Guardar versão anterior e oferecer backup/restauração antes de escrita.
- Histórico não pode usar mera diferença entre dois saldos como rentabilidade; são necessários aportes/resgates e metodologia de retorno apropriada.
- A verificação rígida dos quatro subtotais pertence ao importador legado de Excel consolidado; não deve ser usada para bloquear fontes novas independentes. Nova conciliação é **por origem**, não por planilha mestra.

## USD/BRL referenciado à data

Usar o **dia de avaliação do investimento** (`valuationDate`), não o dia em que o print ou extrato foi anexado. Fonte planejada: PTAX do Banco Central do Brasil (dólar comercial, venda, boletim de fechamento).

- Consultar o dia de referência; se não houver cotação (feriado/fim de semana), consultar o último dia útil com dado disponível **sem usar data futura**. Exibir a data efetiva da PTAX.
- Exibir `US$ 10.000 × R$ X,XXXX (PTAX venda dd/mm/aaaa) = R$ ...`; não classificar conversão como valor de liquidação efetiva.
- Nunca inventar taxa. Se API falhar, preservar a última taxa identificada com alerta de data defasada ou permitir entrada manual com fonte explícita.
- Dados de posições não devem ser enviados à API; apenas a data de referência solicitada. O CSP atual `connect-src 'none'` impede consultas automáticas: implementação exigirá alteração restrita e testada (preferencialmente proxy do mesmo domínio) e explicação clara da nova dependência de rede.
- Proventos em USD podem demandar regras distintas de câmbio para fins tributários; a conversão de visualização patrimonial **não** é cálculo fiscal.

## Privacidade e reconhecimento de capturas

A V4.1 atual roda essencialmente no navegador e não oferece OCR automático de imagens. Duas rotas futuras distintas:

1. **Rota assistida:** usuário envia screenshots/extrato ao ChatGPT para interpretação, revisa os campos estruturados e importa arquivo aprovado no Wealth Intelligence. O envio ao ChatGPT deve ser escolha consciente; ocultar CPF, contas e identificadores não essenciais. Não usar dados pessoais em GitHub/CI.
2. **Rota no aplicativo:** se for incluído OCR local, testar precisão contra prints reais; se for necessária visão por serviço externo, solicitar permissão específica, descrever retenção/transmissão e habilitar somente após aprovação. Nunca apresentar OCR como validação de extrato.

## Plano de entrega

A. Homologar um print representativo da XP e um extrato de proventos exportado, com campos sensíveis ocultos. Mapear as colunas e exemplos de erros.

B. Entregar onboarding com carteira vazia e fonte XP/manual, editor de previdência simplificado e importação por origem com prévia de alterações.

C. Implementar proventos por extrato, deduplicação e vínculo com posições sem duplicar patrimônio.

D. Implementar PTAX datada (com cache, referência, indisponibilidade e fallback manual) e testes em WebKit/Safari.

E. Validar a reconstrução do patrimônio com as fontes reais, demonstrando conferência por instituição, histórico, backup, restauração e discrepâncias.

**Critério de aprovação:** nenhuma posição fictícia, nenhuma atualização silenciosa sem prova, nenhuma duplicação de saldos ou proventos, nenhuma rentabilidade presumida, e todas as fontes e datas visíveis ao tocar em um valor.

## Referências públicas para integração futura

- BCB PTAX: https://dadosabertos.bcb.gov.br/dataset/dolar-americano-usd-todos-os-boletins-diarios
- XP guia de relatórios auxiliares e extratos: https://web.xpi.com.br/xp/documentos/guia-xp-ir/

**Não implementar parsers de formatos XP específicos sem amostras reais do layout esperado.**
