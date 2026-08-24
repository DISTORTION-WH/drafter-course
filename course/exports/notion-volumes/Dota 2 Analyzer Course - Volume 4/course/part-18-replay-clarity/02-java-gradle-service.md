# Глава 2. Java, Gradle и отдельный parser service

## 1. Почему Java

Clarity написан на Java. Использовать его напрямую в небольшом Java service проще, чем:

- портировать parser в Node.js;
- запускать JVM через fragile native bridge;
- смешивать memory lifecycle с Nest API;
- передавать бинарные replay через mobile/backend process.

Node остаётся orchestration/API, Java отвечает только за parsing.

## 2. Минимальные основы Java

```java
public final class ParseRequest {
    private final String runId;
    private final String inputPath;

    public ParseRequest(String runId, String inputPath) {
        this.runId = runId;
        this.inputPath = inputPath;
    }

    public String runId() {
        return runId;
    }

    public String inputPath() {
        return inputPath;
    }
}
```

- `class` объединяет данные/методы;
- `public` доступен другим packages;
- `final class` нельзя наследовать;
- `private final` поле задаётся один раз constructor;
- `String` — ссылочный тип текста;
- method объявляет return type перед именем;
- `new ParseRequest(...)` создаёт объект.

В современной Java удобнее record:

```java
public record ParseRequest(String runId, String inputPath) {}
```

Он создаёт immutable carrier и accessors автоматически. Для domain validation всё равно нужен factory/service.

## 3. Packages

```text
services/replay-parser/
  build.gradle.kts
  settings.gradle.kts
  gradlew / gradlew.bat / gradle/wrapper
  src/main/java/com/example/dota/replay/
    Main.java
    application/
    clarity/
    storage/
    output/
  src/test/java/com/example/dota/replay/
```

Package строка соответствует path:

```java
package com.example.dota.replay.application;
```

## 4. Gradle wrapper

Wrapper фиксирует Gradle distribution для проекта:

```powershell
.\gradlew.bat test
.\gradlew.bat build
```

Linux/CI:

```bash
./gradlew test
./gradlew build
```

Не требуйте от каждого developer вручную устанавливать случайную Gradle version.

## 5. `build.gradle.kts`

Учебная основа:

```kotlin
plugins {
    application
    java
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.skadistats:clarity:4.0.1")
    testImplementation(platform("org.junit:junit-bom:<pinned-version>"))
    testImplementation("org.junit.jupiter:junit-jupiter")
}

tasks.test {
    useJUnitPlatform()
}

application {
    mainClass.set("com.example.dota.replay.Main")
}
```

Placeholder JUnit version заменяется reviewed текущей версией. Clarity `4.0.1` отражает README на дату курса; pin/lock/checksums и golden tests обязательны.

## 6. CLI как первый интерфейс

До HTTP/queue создайте one-shot command:

```text
replay-parser parse
  --run-id <uuid>
  --input /work/replay.dem
  --output /work/output
  --schema-version 1
```

Exit codes:

```text
0 success
2 invalid request/config
3 corrupted/unsupported replay
4 transient storage error
5 parser internal error
```

Machine result также записывается JSON manifest. Не разбирайте human log для определения успеха.

## 7. Архитектурные interfaces

```java
public interface ReplayParser {
    ParseResult parse(ParseCommand command) throws ParseException;
}

public interface ArtifactStore {
    LocalReplay acquireInput(ReplayInput input) throws StorageException;
    StoredManifest publish(ParseOutput output) throws StorageException;
}
```

Clarity adapter реализует `ReplayParser`; object storage adapter — `ArtifactStore`. Unit tests подменяют interfaces.

## 8. Один process на job или service

Стартовый вариант — bounded worker/service:

- один JVM container обрабатывает ограниченное число jobs/concurrency;
- каждый replay имеет temp directory;
- при подозрении на memory leak worker переразмещается после N jobs;
- отдельный one-shot container job даёт сильнее изоляцию, но больше startup cost.

Выбор измеряется на pilot. API process никогда не парсит replay.

## 9. Docker image

Multi-stage:

```dockerfile
FROM eclipse-temurin:17-jdk AS build
WORKDIR /src
COPY . .
RUN ./gradlew --no-daemon clean build

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /src/build/libs/replay-parser-all.jar /app/parser.jar
USER 10001
ENTRYPOINT ["java", "-jar", "/app/parser.jar"]
```

Фактическое jar task/name зависит от Gradle packaging plugin. Base image/digest обновляется контролируемо; runtime non-root, read-only root и отдельный bounded temp volume.

## 10. Практика

Создайте service, запустите `test/build`, реализуйте CLI `info` без Clarity parsing: он валидирует arguments, вычисляет SHA-256 файла и пишет versioned manifest. Это доказывает Java/Gradle/container boundary.

Официальный источник: [Clarity repository](https://github.com/skadistats/clarity).

[Предыдущая глава](01-replay-scope-sources.md) · [Оглавление](README.md) · [Следующая глава](03-clarity-event-model.md)

