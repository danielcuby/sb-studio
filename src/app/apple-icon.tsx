import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const font = await readFile(join(process.cwd(), "src/assets/BigShoulders-ExtraBold.ttf"));

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#141210",
          color: "#ece4d6",
          fontFamily: "Big Shoulders",
          fontSize: 96,
          lineHeight: 1,
        }}
      >
        SB
        <div style={{ width: 96, height: 6, marginTop: 10, background: "#c39a5a" }} />
      </div>
    ),
    { ...size, fonts: [{ name: "Big Shoulders", data: font, weight: 800, style: "normal" }] },
  );
}
