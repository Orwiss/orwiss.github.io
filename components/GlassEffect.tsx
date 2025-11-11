// components/GlassEffect.tsx
"use client";
import React, { useRef, useState, useEffect } from "react";

interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  filterId?: string;
  // displacement scale 등 옵션
  scale?: number;
  blurStdDev?: number;
  maskScale?: number; // 0~1, default 0.7
}

export default function GlassEffect({
  children,
  className = "",
  filterId = "glass-filter",
  scale = 70,
  blurStdDev = 4,
  maskScale = 0.7,
}: GlassEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maskUrl, setMaskUrl] = useState<string>("");

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const style = getComputedStyle(el);
      // border-radius(px 혹은 %)
      const br = style.borderRadius;

      // 1) offscreen canvas
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(width);
      canvas.height = Math.ceil(height);
      const ctx = canvas.getContext("2d")!;

      // 2) 중앙 기준 스케일
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(maskScale, maskScale);
      ctx.translate(-width / 2, -height / 2);

      // 3) 라운드된 사각형(마스크) 그리기
      const rad = parseFloat(br); // px 값만 처리. %면 추가 계산 필요
      ctx.beginPath();
      ctx.moveTo(rad, 0);
      ctx.lineTo(width - rad, 0);
      ctx.quadraticCurveTo(width, 0, width, rad);
      ctx.lineTo(width, height - rad);
      ctx.quadraticCurveTo(width, height, width - rad, height);
      ctx.lineTo(rad, height);
      ctx.quadraticCurveTo(0, height, 0, height - rad);
      ctx.lineTo(0, rad);
      ctx.quadraticCurveTo(0, 0, rad, 0);
      ctx.closePath();

      // 흰색 채우기 (마스크)
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.restore();

      setMaskUrl(canvas.toDataURL());
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [maskScale]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* SVG 필터 정의 */}
      <svg className="absolute w-0 h-0">
        <filter
          id={filterId}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          filterUnits="objectBoundingBox"
        >
          {/* in2로 사용할 스케일된 & 라운드된 마스크 이미지를 불러옴 */}
          <feImage
            xlinkHref={maskUrl}
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            result="maskScaled"
          />
          {/* 잘리지 않게 블러 */}
          <feGaussianBlur in="maskScaled" stdDeviation={blurStdDev} result="blurMask" />
          {/* SourceGraphic 과 blurMask 결합 (displacement) */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurMask"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* 필터 적용 */}
      <div style={{ filter: `url(#${filterId})` }}>{children}</div>
    </div>
  );
}
