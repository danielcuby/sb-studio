import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { images } from "@/config/images";
import { site } from "@/config/site";

export const alt = `${site.name}: barber in Gibraltar. One chair. One barber. Your time.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = await readFile(join(process.cwd(), "src/assets/BigShoulders-ExtraBold.ttf"));
const photo = `data:image/jpeg;base64,${await readFile(join(process.cwd(), "public", images.hero.src), "base64")}`;

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#141210" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img */}
        <img src={photo} alt="" width={1200} height={800} style={{ position: "absolute", top: -60, left: 0, width: 1200, height: 800, objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(90deg, rgba(20,18,16,0.96) 0%, rgba(20,18,16,0.85) 45%, rgba(20,18,16,0.25) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#ece4d6", fontSize: 44, fontFamily: "Big Shoulders" }}>
            SB
            <div style={{ width: 36, height: 3, background: "#c39a5a" }} />
            <span style={{ fontSize: 30, letterSpacing: 6, color: "#a39885" }}>STUDIO</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Big Shoulders", fontSize: 128, lineHeight: 0.9, color: "#ece4d6" }}>
            <span>ONE CHAIR.</span>
            <span>ONE BARBER.</span>
            <span>YOUR TIME.</span>
          </div>
          <div style={{ display: "flex", color: "#dcb779", fontSize: 30, fontFamily: "Big Shoulders", letterSpacing: 2 }}>
            GIBRALTAR · BOOK ONLINE · CUTS FROM £8
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Big Shoulders", data: font, weight: 800, style: "normal" }] },
  );
}
