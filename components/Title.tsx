import { useState, useEffect, useRef } from 'react';

interface TitleProps {
  titleText: string;
  blackoff: () => void;
}

export default function Title({ titleText, blackoff }: TitleProps) {
  const [num, setNum] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const title = useRef<HTMLParagraphElement | null>(null);
  const mobile = /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

  useEffect(() => {
    const max = mobile ? 18 : 30;

    const interval = setInterval(() => {
      setNum((prev) => {
        const currentWidth = title.current ? title.current.offsetWidth : 0;
        if (prev >= max - 0.1 || currentWidth > window.innerWidth - 20) {
          if (opacity === 1) {
            setTimeout(() => {
              setOpacity(0);
            }, 2000);
          }
          return prev;
        } else {
          return prev + (max - prev) * 0.01;
        }
      });
    }, 1);

    return () => clearInterval(interval);
  }, [mobile, opacity]);

  useEffect(() => {
    if (opacity === 0 && blackoff) {
      blackoff();
    }
  }, [opacity, blackoff]);

  const text = titleText;

  return (
    <div className="flex items-center justify-center w-full h-full">
      <p
        ref={title}
        className="text-center font-extrabold text-[clamp(32pt,6vw,64pt)] whitespace-pre-wrap transition-opacity duration-1000"
        style={{
          letterSpacing: `${num}px`,
          opacity: opacity,
        }}
      >
        {text}
      </p>
    </div>
  );
}