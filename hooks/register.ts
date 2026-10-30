import type { Register } from 'claude-code'

export const TIMEOUT_REPLY = 'Investigate the best option yourself and decide.'
const DEFAULT_TIMEOUT_MINUTES = 15
const MS_PER_MINUTE = 60_000

const timeoutMsFrom = (value: unknown): number => {
  const minutes = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_TIMEOUT_MINUTES
  return minutes > 0 ? minutes * MS_PER_MINUTE : 0
}

export const register: Register = (on, options) => {
  const timeoutMs = timeoutMsFrom(options.timeoutMinutes)

  on('tool.call', { tool: 'AskUserQuestion' }, ($, e, next) => {
    // Off, or answers already supplied by someone above: nothing to wait on.
    if (timeoutMs === 0 || e.answers !== undefined) return next(e)

    return new Promise((resolve, reject) => {
      let isSettled = false

      const timer = $.clock.after(timeoutMs, () => {
        if (isSettled) return
        isSettled = true
        const answers = Object.fromEntries(e.questions.map(q => [q.question, TIMEOUT_REPLY]))
        $.ui.toast(`No answer after ${timeoutMs / MS_PER_MINUTE} min; the agent will decide.`)
        // Returning while next(e) is pending aborts the dialog beneath.
        resolve({ result: { questions: e.questions, answers, afkTimeoutMs: timeoutMs } })
      })

      next(e).then(
        result => {
          if (isSettled) return
          isSettled = true
          timer.cancel()
          resolve(result)
        },
        error => {
          if (isSettled) return
          isSettled = true
          timer.cancel()
          reject(error)
        },
      )
    })
  })
}
