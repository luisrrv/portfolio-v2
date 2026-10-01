---
title: Running untrusted React components in the browser
description: Compile, scope, validate, isolate, recover. The five layers I used to let someone else's UI code run inside a page without breaking it.
date: 2026-09-30
---

Page builders, plugin systems and customizable dashboards all have the same problem somewhere in them: users write UI code, and your app has to run it. That code might be broken or it might be hostile, and either way the rest of the page has to keep working.

I built [a small playground](https://playground.lrod.dev) to work through that problem end to end. You write a React component in TSX, it compiles and renders live, and a gallery of examples tries to break it in nine different ways. This note walks through how it works, layer by layer, and what each layer does and doesn't protect against.

The source is on [GitHub](https://github.com/luisrrv/component-playground).

## What can go wrong

Before choosing any tools, I listed what a user's component could do to the page hosting it:

- **Fail to compile.** A syntax error or a half-typed line.
- **Import things it shouldn't.** Anything from a network client to your app's internal modules.
- **Get the wrong data.** Props that don't match what the component expects.
- **Throw.** During render, or later from a click handler or a timer.
- **Hang.** An infinite loop, or a regex that backtracks forever.
- **Reach out.** Read the host's DOM, cookies or storage, or send data somewhere with `fetch`.

Each of these needs a different defense, and no single one covers them all. An error boundary doesn't stop a `fetch`, and a sandboxed iframe doesn't stop an infinite loop. So the playground is built as layers, each with one job:

<figure>
  <svg role="img" aria-label="The host compiles the code, scans its imports and instruments its loops, then posts it to a sandboxed iframe. The sandbox resolves imports from an allowlist, validates props and renders inside an error boundary, then posts back rendered or error. A watchdog pings the sandbox every second." xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">
    <rect width="640" height="300" fill="#212121"/>
    <g fill="none" stroke="#454545">
      <rect x="20" y="40" width="250" height="170"/>
      <rect x="370" y="40" width="250" height="170"/>
    </g>
    <g fill="#959592" font-size="11">
      <text x="20" y="28">host page (trusted)</text>
      <text x="370" y="28">sandbox iframe (untrusted)</text>
    </g>
    <g fill="#e8e8e6">
      <text x="36" y="76"><tspan fill="#5fbf9b">1</tspan> compile TSX</text>
      <text x="36" y="112"><tspan fill="#5fbf9b">2</tspan> scan imports</text>
      <text x="36" y="148"><tspan fill="#5fbf9b">5</tspan> instrument loops</text>
      <text x="386" y="76"><tspan fill="#5fbf9b">2</tspan> scoped require()</text>
      <text x="386" y="112"><tspan fill="#5fbf9b">3</tspan> validate props</text>
      <text x="386" y="148"><tspan fill="#5fbf9b">5</tspan> render in boundary</text>
    </g>
    <g fill="#959592" font-size="11">
      <text x="386" y="190">4 isolation: opaque origin + CSP</text>
      <text x="36" y="190">syntax errors stop here</text>
    </g>
    <g stroke="#5fbf9b" fill="none">
      <path d="M270 90 H362"/><path d="M356 85 L364 90 L356 95"/>
      <path d="M370 140 H278" stroke-dasharray="4 4"/><path d="M284 135 L276 140 L284 145"/>
    </g>
    <g fill="#959592" font-size="10.5" text-anchor="middle">
      <text x="320" y="80">render</text>
      <text x="320" y="130">result</text>
    </g>
    <g stroke="#959592" fill="none" stroke-dasharray="2 4">
      <path d="M145 210 V262 H495 V210"/>
    </g>
    <text x="320" y="282" fill="#959592" font-size="11" text-anchor="middle">5 watchdog: ping every 1s, restart the iframe after 3s of silence</text>
  </svg>
  <figcaption>Numbers match the sections below. Compiling happens in the host; everything that runs user code happens in the sandbox.</figcaption>
</figure>

## 1. Compile in the browser

The code starts as TSX, which browsers can't run. I wanted the demo to be a static site with no server, so compiling had to happen in the page.

I used [Sucrase](https://github.com/alangpierce/sucrase). It strips TypeScript types and rewrites JSX, and it's small and fast because that's all it does. esbuild-wasm and Babel standalone can do more, but both are much bigger downloads, and a live preview doesn't need bundling or older-browser output.

The part that matters most for safety is Sucrase's `imports` transform. It rewrites every `import` into a `require()` call:

```ts
import { Card } from '@kit/ui'
// becomes
var _ui = require('@kit/ui')
```

That gives the runtime a single place where every dependency is requested, which the next layer uses.

Compiling runs in the host rather than the sandbox. It's a pure string-to-string transform, so it's safe to run there, and syntax errors still show up with a line and column even if the sandbox is down.

The tradeoff: Sucrase doesn't type-check. Type errors in user code are silently ignored, which is fine for a preview but worth knowing.

## 2. Scope what the code can import

The obvious approach is to block the dangerous modules. That list never ends. The playground does the opposite: user code gets a fixed set of modules (`react`, `zod`, and a tiny UI kit), and everything else doesn't exist.

This is checked twice. First, the host scans the compiled code for `require('...')` calls and rejects anything off the list before the code is sent anywhere. The user gets a clear message and nothing runs.

A static scan misses computed names like `require(someVar)`, so the sandbox enforces the same list again at runtime. The code runs with a `require` that only knows about the allowed modules:

```ts
const require = (name: string) => {
  if (Object.hasOwn(modules, name)) return modules[name]
  throw new Error(`'${name}' is not available in this sandbox.`)
}

const run = new Function('require', 'module', 'exports', code)
run(require, module, exports)
```

`Object.hasOwn` matters there. A plain `modules[name]` lookup would also find inherited properties, so `require('constructor')` would return something.

One limit to be honest about: the allowlist covers modules, not globals. User code can still reach `window`, `document` and `fetch` without importing anything. Containing those is the job of layer 4.

## 3. Validate props against a contract

A component that gets the wrong props usually crashes somewhere deep inside, with an error that says nothing about the actual problem. So each module can export a contract alongside the component:

```tsx
export const propsSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['admin', 'member']),
})

export const exampleProps = { name: 'Ada', role: 'admin' }

export default function ProfileCard({ name, role }: z.infer<typeof propsSchema>) {
  // ...
}
```

Before every render, the props are checked against `propsSchema`. If they don't match, the component never runs, and the user sees a list of what's wrong instead of a stack trace:

```
props don't match propsSchema:
name: Too small: expected string to have >=1 characters
role: Invalid option: expected one of "admin"|"member"
```

The previous render stays on screen, so a typo in the props editor doesn't blank out the preview.

Two details here took some thought. The validation runs inside the sandbox, not the host, because the schema is itself user code, and user code only runs in the sandbox. And the check is duck-typed: anything with a `safeParse` method counts as a schema. An `instanceof` check would break the moment the schema came from a different copy of Zod.

## 4. Isolate it in a sandboxed iframe

Layers 1 to 3 handle mistakes. This is the layer that handles bad intent, and it's the one that's enforced by the browser rather than by my code.

Rendering happens in an iframe with `sandbox="allow-scripts"`. What matters is what's missing: without `allow-same-origin`, the frame gets an opaque origin. As far as the browser is concerned, it's a different site from the host, so it can't read the host's DOM, cookies or `localStorage`. `window.parent.document` throws a `SecurityError`. The other flags that are left off also block forms, popups and navigating the top-level page.

On top of that, the sandbox document has a strict Content Security Policy:

```
default-src 'none';
script-src 'self' 'unsafe-eval';
connect-src 'none';
form-action 'none';
base-uri 'none'
```

`connect-src 'none'` is the important line: `fetch`, XHR and WebSocket all fail, so user code can't send anything anywhere. `'unsafe-eval'` is needed because user code runs through `new Function`, and that's acceptable here because the whole document exists to run untrusted code.

The host and sandbox talk only through `postMessage`, and both sides treat every message as untrusted input:

- **Check the sender.** The host ignores anything that isn't from its own iframe (`event.source`), and the sandbox ignores anything that isn't from its parent.
- **Validate the shape.** Every message is parsed with a Zod schema on both sides, and error messages are length-capped.
- **Tag each render with an id.** If a slow render from three edits ago reports back late, the host sees an old id and drops it. Without this, a stale result can overwrite a newer one.

Because the sandbox has an opaque origin, messages have to be sent with a target origin of `'*'`. That's fine only because nothing sensitive ever goes into them: just the user's own code and the render status.

## 5. Recover from crashes and hangs

The last layer assumes something got through and makes sure the page recovers.

**Render errors** are caught by an error boundary around the component. **Errors outside render**, like a throw in a click handler or a timer, never reach an error boundary, so the sandbox also listens for `error` and `unhandledrejection` on `window`.

**Hangs** are harder. Error boundaries can't help with `while (true) {}` because nothing is thrown, and a hung script can't report anything. I ended up with two mechanisms.

The first is a **loop guard**. Before the code is sent, the host parses it (with acorn) and rewrites every loop to check a timer on each iteration:

```js
while (x) { body }
// becomes
{ const __t1 = performance.now(); while (x) { __loopGuard(__t1); body } }
```

After one second, `__loopGuard` throws, and the infinite loop becomes an ordinary render error. It works in every browser. It's also easy to get around if you're trying to, so it's a usability feature, not a security boundary.

The second is a **watchdog**, which catches everything else, like a regex that backtracks forever. The host pings the sandbox every second. If three seconds pass without a reply, the host throws the whole iframe away and mounts a fresh one: new document, new JavaScript realm. It deliberately doesn't resend the code that hung, or the new iframe would hang too.

The watchdog has a catch: it only works if the stuck iframe isn't blocking the host. Chromium runs sandboxed cross-origin frames in their own process, so the host keeps running and can pull the plug. Browsers that share a thread between the two freeze the whole tab until the loop guard fires. That's why the loop guard matters, even though the watchdog looks like the stronger tool.

## Things that surprised me

A few bugs taught me more than the parts that worked the first time:

- **The sandbox couldn't load its own scripts.** With an opaque origin, even the sandbox's own JavaScript files count as cross-origin, and module scripts are fetched with CORS. The iframe sat on "loading" until I served `/assets/*` with `Access-Control-Allow-Origin: *`. That's safe here because those files are public anyway.
- **An infinite loop hit the watchdog instead of the loop guard.** React retries a render that throws before giving up, so the guard threw, React tried again, and the same loop ran for another second, then another. The fix was to make the guard "sticky": once it trips, it throws immediately until the next render.
- **"Rendered" was reported before anything rendered.** I posted success right after calling `root.render()`, but rendering happens later. A component that crashed during render would briefly report success, then error. Now a small wrapper sends "rendered" from an effect, which only runs once React has actually committed the tree.

## What this doesn't cover

- **Type-checking.** Types are stripped, not checked, and nothing verifies that `propsSchema` matches the component's prop types.
- **CPU and memory limits.** The watchdog recovers from hangs, but a component can still use a lot of memory or CPU before anything notices.
- **Side channels.** Timing tricks and layout measurement aren't in scope.
- **The browser's own sandbox.** Everything in layer 4 relies on the browser enforcing origins and CSP correctly, which is a reasonable bet but still a bet.

For production use, the next steps would be running the compiler in a Web Worker, type-checking where it matters, and serving the sandbox from a separate domain rather than relying only on the opaque origin.

## Try it

The [playground](https://playground.lrod.dev) has a working example and one example per failure case, so you can watch each layer catch something. The [source and README](https://github.com/luisrrv/component-playground) go into each decision in more detail.

A follow-up, [Themes, slots and AI edits for untrusted components](/notes/theming-slots-and-ai-edits/), covers customizing the component kit and letting an AI edit the code.
