# Esports Envy Engine

скопируй проект с этого гитхаба https://github.com/VeryGood0/esports-simulator

и внеси некоторые правки
почему в четвертьфинале команде уже засчитало победу, пофикси эту херню

и сделай чтобы когда мало инфы о картах, все таки чуть больше рейтинг команд решает, сделай чтобы значимость рейтинга можно было высатвялть в настройках настраивать

так же иногда команде засчитывает победу в турнире 2 раза по какой-то причине, пофикси

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a37deaad-dafb-4163-9f9b-6ce1106d3fd9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Исправления симулятора турниров

- Матч за 3-е место создаётся во всех поддерживаемых плей-офф-сетках, где включена эта настройка. Турнир не считается завершённым, пока матч за 3-е место не сыгран.
- Для GSL-групп по 8 команд в настройках создания турнира можно выбрать перекрёстный или одноимённый переход проигравших из верхних полуфиналов в нижние полуфиналы. Перекрёстный вариант включён по умолчанию.
- В GSL-группах можно вручную выбрать пары стартового раунда. Последующие матчи формируются по результатам сетки.
- Завершённые турниры сохраняются во вкладке «Прошедшие турниры».
- Удаление турнира отменяет его записанные изменения VRS, удаляет связанные записи истории и пересобирает статистику карт по оставшимся матчам — включая последние результаты на карте.
- В истории матчей и статистике карт команд отображаются название турнира и этап.

Для запуска локально: `npm install`, затем `npm run dev`. Для проверки тестов: `npm test`.
