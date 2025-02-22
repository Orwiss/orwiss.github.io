import React from "react";

interface SectionProps {
  title: string;
  items: { period?: string; date?: string; school?: string; title?: string }[];
}

const Section: React.FC<SectionProps> = ({ title, items }) => {
  return (
    <div className="w-full mb-16 text-center lg:text-left break-keep">
      <h1 className="mb-5 text-3xl xl:text-4xl font-bold">{title}</h1>
      <div className="flex flex-col">
        {items.map((item, index) => (
          <div key={index} className="mb-4 xl:mb-8 text-lg xl:text-2xl">
            <p className="mb-0.5 font-light">{item.period || item.date}</p>
            <span className="font-light whitespace-pre-line">
              {item.school || item.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Section;