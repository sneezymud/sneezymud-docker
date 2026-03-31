// Preload script for component integration tests. Registers happy-dom
// globals (window, document, etc.) so React can render in Bun's test runner.
//
// This runs INSTEAD of test-preload.ts - component tests don't need DB
// access and shouldn't inherit the DB truncation/seeding logic.

import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
