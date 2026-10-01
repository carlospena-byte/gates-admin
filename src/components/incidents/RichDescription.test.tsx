import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichDescription } from "./RichDescription";

describe("RichDescription", () => {
  it("renders the allowed formatting", () => {
    const { container } = render(
      <RichDescription html='<p><strong>Hola</strong> <a href="https://example.com">enlace</a></p><ul><li>Uno</li></ul>' />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("Hola");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    expect(container.querySelectorAll("li")).toHaveLength(1);
  });

  it("never injects scripts, handlers or unsafe links", () => {
    const { container } = render(
      <RichDescription html='<p onclick="x()">Hi</p><script>alert(1)</script><img src=x onerror="y()"><a href="javascript:alert(1)">bad</a>' />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("[onclick]")).toBeNull();
  });

  it("shows legacy plain text untouched", () => {
    const { container } = render(<RichDescription html="Sin formato & simple" />);
    expect(container.textContent).toBe("Sin formato & simple");
  });
});
