# Health Tracker

PWA responsivo, mobile-first, para acompanhar bioimpedância, composição corporal e exames laboratoriais.

## V3

- Dashboard corporal com histórico de bioimpedância.
- Composição corporal e análise segmentar.
- Gráficos de peso, massa muscular, gordura corporal e IMC.
- Novo módulo **Saúde** para resultados laboratoriais.
- Gráficos individuais por marcador laboratorial.
- Histórico de exames e cadastro manual de novos resultados.
- Importação/exportação de backup JSON.
- Dados persistidos no `localStorage` do navegador.
- Compatível com instalação como PWA no iPhone.

## Dados

O código atual não precisa conter dados pessoais. O histórico pode ser carregado por um arquivo JSON privado e permanece salvo no dispositivo. O schema V3 suporta:

- `profile`
- `measurements`
- `labs`

Backups V2 continuam aceitos; nesse caso o app importa as bioimpedâncias e inicia o módulo de exames vazio.
