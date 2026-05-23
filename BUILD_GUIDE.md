# 📦 Сборка в .EXE для Windows

## 🚀 Автоматическая сборка через GitHub Actions

### Преимущества:
- ✅ Не нужен мощный ПК
- ✅ Чистая среда сборки
- ✅ Автоматическое создание релиза
- ✅ Оптимизировано для приватных репозиториев

### Как использовать:

#### 1. Push в main/master
```bash
git add .
git commit -m "Build release"
git push origin main
```
Сборка запустится автоматически.

#### 2. Ручной запуск (без коммита)
1. Зайдите в репозиторий на GitHub
2. Перейдите во вкладку **Actions**
3. Выберите workflow **"Build Windows EXE"**
4. Нажмите **"Run workflow"**
5. Выберите ветку (main/master)
6. Нажмите **"Run workflow"** ещё раз

#### 3. Где найти результат?
- Через 10-20 минут сборка завершится
- Артефакт появится в разделе **Actions** → клик на запущенный workflow → раздел **Artifacts**
- Файл: `vysper-windows-exe.zip`
- Если это push в main — автоматически создастся **Release** с .exe файлом

---

## 💻 Локальная сборка (на своём ПК)

### Требования:
- Windows 10/11
- Node.js 20+
- 4GB+ свободной RAM
- 5GB+ места на диске

### Шаги:

```bash
# 1. Установка зависимостей
npm install

# 2. Установка браузера для Puppeteer
npx puppeteer browsers install chrome

# 3. Сборка
npm run build
```

### Где искать .exe?
```
dist/Vysper Setup x.x.x.exe
```

---

## ⚙️ Оптимизация для приватных репозиториев

GitHub Actions workflow настроен с оптимизациями:

| Оптимизация | Описание |
|------------|----------|
| `fetch-depth: 1` | Скачивает только последний коммит (быстрее) |
| `cache: npm` | Кэширует node_modules между запусками |
| `cache: puppeteer` | Кэширует браузер Chrome |
| `concurrency` | Отменяет дублирующие сборки |
| `retention-days: 14` | Хранит артефакты 2 недели (не год) |
| `if: workflow_dispatch \|\| main` | Собирает только main или вручную |

### Лимиты GitHub Actions (Free):
- ⏱️ 2000 минут/месяц для приватных репозиториев
- 💾 500MB хранилище артефактов
- 📦 10GB bandwidth

**Одна сборка занимает ~10-15 минут**, так что 2000 минут = ~130+ сборок в месяц.

---

## 🔧 Troubleshooting

### "Build failed: Cannot find module"
```bash
# Очистите кэш и переустановите
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Puppeteer browser not found"
```bash
npx puppeteer browsers install chrome
```

### "GitHub Actions too slow"
- Убедитесь что кэш работает (смотрите логи `Cache restored`)
- Первый запуск всегда медленный (~15 мин)
- Последующие с кэшем: ~5-7 минут

### "Artifact expired"
- Артефакты хранятся 14 дней
- Скачайте сразу после сборки
- Или используйте Releases (если push в main)

---

## 📝 Примечания

- Сборка включает все зависимости (Whisper, Puppeteer, LM Studio client)
- Конечный .exe весит ~150-200MB
- При первом запуске может потребоваться установка Visual C++ Redistributable
