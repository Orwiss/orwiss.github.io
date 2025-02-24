import React from "react";
import Section from "./about/Section";
import { educationData, exhibitionData, projectData } from "./about/data";

const About = () => {
  return (
    <div className="w-full h-full flex justify-center">
      <div className="flex flex-col justify-start lg:justify-center w-[70vw] sm:w-[80vw] pt-[10vh] lg:pt-[14vh] text-white overflow-y-scroll xl:overflow-y-visible">
        <div className="flex flex-col lg:flex-row justify-between items-center">
          <div className="flex flex-col lg:flex-row items-center">
            <img src="/images/orwiss.png" className="w-[150px] h-[150px] rounded-full"/>
            <div className="lg:ml-[66px] text-center lg:text-left mt-6 lg:mt-0">
              <h2 className="text-3xl lg:text-5xl font-bold">박성훈(Orwiss)</h2>
              <p className="text-md lg:text-xl mt-4">orwiss.design@gmail.com<br/>orwiss@kookmin.ac.kr</p>
            </div>
          </div>
          <a href="https://orwiss.notion.site/6d45f80728b24b719db9c224bd68d6e1">
            <div className="w-fit h-fit px-8 py-5 mt-6 lg:mt-0 text-sm xl:text-xl whitespace-nowrap text-white bg-white bg-opacity-50 rounded-full backdrop-blur-sm pointer-events-auto">
              CV Page
            </div>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 w-full h-full gap-0 lg:gap-10 mt-12 pt-12 overflow-y-visible xl:overflow-y-scroll pointer-events-auto">
          <div>
            <Section title="Education" items={educationData} />
          </div>
          <div>
            <Section title="Exhibition" items={exhibitionData} />
            <Section title="Project" items={projectData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
