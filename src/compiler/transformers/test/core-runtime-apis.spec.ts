import * as ts from 'typescript';

import * as d from '../../../declarations';
import { createModule } from '../../transpile/transpiled-module';
import { addCoreRuntimeApi, addLegacyApis, RUNTIME_APIS } from '../core-runtime-apis';

describe('addCoreRuntimeApi()', () => {
  let mockModule: d.Module;

  beforeEach(() => {
    const sourceText = "console.log('hello world');";
    mockModule = createModule(
      ts.createSourceFile('mock-file.ts', sourceText, ts.ScriptTarget.ES5),
      sourceText,
      'mock-file.js'
    );
  });

  it("adds new entries to a module's coreRuntimeApis", () => {
    expect(mockModule.coreRuntimeApis).toBeDefined();
    expect(mockModule.coreRuntimeApis).toHaveLength(0);

    addCoreRuntimeApi(mockModule, RUNTIME_APIS.attachShadow);
    expect(mockModule.coreRuntimeApis).toEqual([RUNTIME_APIS.attachShadow]);

    addCoreRuntimeApi(mockModule, RUNTIME_APIS.createEvent);
    expect(mockModule.coreRuntimeApis).toEqual([RUNTIME_APIS.attachShadow, RUNTIME_APIS.createEvent]);
  });

  it("does not allow duplicate entries in a module's coreRuntimeApis", () => {
    expect(mockModule.coreRuntimeApis).toBeDefined();
    expect(mockModule.coreRuntimeApis).toHaveLength(0);

    addCoreRuntimeApi(mockModule, RUNTIME_APIS.attachShadow);
    expect(mockModule.coreRuntimeApis).toEqual([RUNTIME_APIS.attachShadow]);

    // attempt to add the api again, doing so shall not create a duplicate entry
    addCoreRuntimeApi(mockModule, RUNTIME_APIS.attachShadow);
    expect(mockModule.coreRuntimeApis).toEqual([RUNTIME_APIS.attachShadow]);
  });
});

describe('addLegacyApis()', () => {
  let mockModule: d.Module;

  beforeEach(() => {
    const sourceText = "console.log('hello world');";
    mockModule = createModule(
      ts.createSourceFile('mock-file.ts', sourceText, ts.ScriptTarget.ES5),
      sourceText,
      'mock-file.js'
    );
  });

  it("adds a legacy API to a module's coreRuntimeApis", () => {
    expect(mockModule.coreRuntimeApis).toBeDefined();
    expect(mockModule.coreRuntimeApis).toHaveLength(0);

    addLegacyApis(mockModule);
    expect(mockModule.coreRuntimeApis).toEqual([RUNTIME_APIS.legacyH]);
  });

  it("does not allow duplicate legacy API entries in a module's coreRuntimeApis", () => {
    expect(mockModule.coreRuntimeApis).toBeDefined();
    expect(mockModule.coreRuntimeApis).toHaveLength(0);

    addLegacyApis(mockModule);
    expect(mockModule.coreRuntimeApis).toEqual([RUNTIME_APIS.legacyH]);

    // attempt to add the api again, doing so shall not create a duplicate entry
    addLegacyApis(mockModule);
    expect(mockModule.coreRuntimeApis).toEqual([RUNTIME_APIS.legacyH]);
  });
});
