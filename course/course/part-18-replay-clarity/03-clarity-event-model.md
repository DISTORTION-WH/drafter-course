# Глава 3. Clarity: event model и минимальный parser

## 1. Event-driven подход

Clarity читает replay и вызывает annotated methods processors при интересующих событиях. Это не «загрузить весь матч в один объект».

```text
Source
-> Runner
-> internal Clarity processors/providers
-> our annotated processors
-> bounded output writers/aggregators
```

Подписывайтесь только на нужные события: полный raw dump создаёт огромный output и сильнее связывает schema с game build.

## 2. Source

Clarity examples описывают:

- `MappedFileSource` для локально доступного файла;
- `InputStreamSource` для stream;
- `SimpleRunner` для одного последовательного прохода;
- `ControllableRunner` для более сложного seek.

Наш pipeline сначала безопасно скачивает и проверяет replay в bounded temp file, затем использует mapped/local source. Это упрощает checksum, retry и random access.

## 3. Минимальный runner

```java
import skadistats.clarity.processor.runner.SimpleRunner;
import skadistats.clarity.source.MappedFileSource;
import skadistats.clarity.source.Source;

public final class ClarityReplayParser implements ReplayParser {
    @Override
    public ParseResult parse(ParseCommand command) throws Exception {
        Source source = new MappedFileSource(command.inputPath().toString());
        SimpleRunner runner = new SimpleRunner(source);
        OverviewProcessor overview = new OverviewProcessor(command);

        runner.runWith(overview);
        return overview.result();
    }
}
```

Точные constructors/exceptions проверяются компилятором версии 4.0.1. Реальный code закрывает source/resources согласно API, перехватывает ошибки в boundary и всегда очищает temp.

## 4. Processor

```java
public final class OverviewProcessor {
    private final ParseCommand command;
    private long observedEvents;

    public OverviewProcessor(ParseCommand command) {
        this.command = command;
    }

    public void incrementObservedEvents() {
        observedEvents += 1;
    }

    public ParseResult result() {
        return new ParseResult(command.runId(), observedEvents);
    }
}
```

Позже annotated callback Clarity вызывает `increment`/writer. State принадлежит одному parse run и не шарится между threads/replays.

## 5. Annotations и Context

Clarity examples показывают callbacks вроде `@OnMessage(...)`. `Context` позволяет получить текущий tick, engine type и build number для Source 2. Наш processor сохраняет:

```text
engine type
game build
first/last tick
ticks observed
event type counts
warnings
```

Build number обязателен в output manifest, если доступен: property/event semantics могут меняться.

## 6. Overview fast path

Clarity имеет `infoForFile`/overview API для базовой информации без полного прохода согласно examples. Используйте его как preflight:

- файл читается;
- match ID совпадает с ожидаемым;
- winner/duration/players доступны;
- engine/build обнаружены;
- parser поддерживает build policy.

Preflight не заменяет full parse и не гарантирует целостность конца файла.

## 7. Один или несколько processors

```text
OverviewProcessor
CombatLogProcessor
HeroPositionProcessor
QualityProcessor
```

Runner может получить несколько processors. Общий `OutputCoordinator` выдаёт sequence IDs и bounded writers, но processors не должны зависеть от случайного порядка callbacks без документированной модели.

## 8. Streaming output

Не храните миллион events в `List`:

```java
public interface EventSink<T> extends AutoCloseable {
    void write(T event) throws IOException;
    long count();
}
```

Sink пишет NDJSON/columnar batch/temp artifact, считает bytes/records и останавливает output при limit. Manifest публикуется только после успешного close/checksum.

## 9. Unknown properties/events

Patch может:

- добавить неизвестное событие;
- переименовать entity property;
- изменить type;
- убрать message;
- изменить coordinate mapping.

Unknown optional data создаёт warning/count; required invariant — controlled unsupported/quality failure. Не выдавайте нули как реальные значения.

## 10. Практика

Возьмите законно доступный test replay. Сначала извлеките только overview, engine/build/ticks и сравните match ID/winner/duration с canonical API. Сохраните versioned manifest, не raw console dump.

Официальные examples: [clarity-examples](https://github.com/skadistats/clarity-examples).

[Предыдущая глава](02-java-gradle-service.md) · [Оглавление](README.md) · [Следующая глава](04-storage-queue-state-machine.md)

