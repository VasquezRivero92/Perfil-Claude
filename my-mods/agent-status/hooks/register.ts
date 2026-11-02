import type { Register } from 'claude-code'

export const register: Register = on => {
  const active = new Map<string, string>()

  const label = () =>
    active.size === 0 ? 'agente: main' : `agente: ${[...active.values()].join(', ')}`

  on('session.start', ($, e, next) => {
    $.ui.status(label())
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const res = await next(e)
    if (res.deny === undefined && res.agentId !== undefined) {
      active.set(res.agentId, e.subagentType)
      $.ui.status(label())
    }
    return res
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId !== undefined && active.delete(e.agentId)) $.ui.status(label())
    return next(e)
  })
}
