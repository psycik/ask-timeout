# ask-timeout

A Claude Code mod that keeps an agent from stalling on an unanswered
`AskUserQuestion` dialog. The dialog opens as usual; if nobody answers within
the configured timeout, the dialog closes and every question is answered with:

> Investigate the best option yourself and decide.

The result is marked with `afkTimeoutMs`, so the agent is told the user was
away rather than that the user chose. An answer given before the timeout goes
through unchanged.

## Install

At the prompt of a Claude Code terminal session:

```text
/plugin install ask-timeout --marketplace psycik/ask-timeout
```

Answer `y` to add the marketplace, then choose a scope.

From a shell:

```bash
claude plugin install ask-timeout --marketplace psycik/ask-timeout
```

## Configuration

| Option | Default | Meaning |
| --- | --- | --- |
| `timeoutMinutes` | `15` | Minutes to wait before answering for the user. `0` turns the timeout off. Fractions work (`0.1` is 6 seconds). |

Change it under `/config`.

## Tests

```bash
claude plugin test .
```
