import { describe, expect, it } from "vitest";
import { internalRenderUrl } from "./render-endpoint";

describe("internalRenderUrl", () => {
  it("targets /api/render on the request's own origin", () => {
    expect(
      internalRenderUrl("https://inkblot.securityronin.com/u/foo/inkblot.png"),
    ).toBe("https://inkblot.securityronin.com/api/render");
  });

  it("ignores the request path and query — only the origin matters", () => {
    expect(
      internalRenderUrl(
        "https://inkblot.securityronin.com/u/foo/inkblot.png?from=1&to=2",
      ),
    ).toBe("https://inkblot.securityronin.com/api/render");
  });

  it("preserves scheme and port (local dev / preview hosts)", () => {
    expect(internalRenderUrl("http://localhost:3000/u/foo/inkblot.png")).toBe(
      "http://localhost:3000/api/render",
    );
    expect(
      internalRenderUrl("https://inkblot-abc-team.vercel.app/u/x/inkblot.png"),
    ).toBe("https://inkblot-abc-team.vercel.app/api/render");
  });
});
