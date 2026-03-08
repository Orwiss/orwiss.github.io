"use client";

import React from 'react';
import { trackSiteEvent } from '@/lib/tracking';

type LinkType = {
  name: string;
  icon: string;
  iconClassName?: string;
  url: string;
};

const links: LinkType[] = [
  {
    name: 'Instagram',
    icon: '/images/Instagram.png',
    url: 'https://www.instagram.com/dv5e1n',
  },
  {
    name: 'OpenProcessing',
    icon: '/images/openprocessing.png',
    url: 'https://openprocessing.org/user/280258',
  },
  {
    name: 'GitHub',
    icon: '/images/github.png',
    iconClassName: 'brightness-0 invert',
    url: 'https://github.com/Orwiss',
  },
];

const Link = () => {
  return (
    <div className="z-40 w-full h-full flex flex-col items-center justify-center">
      {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-[clamp(200px,30%,320px)] h-16 md:h-20 rounded-full my-6 md:my-8 transition-transform transform hover:translate-y-[-4px] text-white text-lg font-bold text-center active:text-black pointer-events-auto"
            onClick={() =>
              trackSiteEvent({
                clarityEvent: "link:click",
                gaEvent: "outbound_link_click",
                payload: { target: link.name, url: link.url },
              })
            }
          >
            <div className="absolute w-full h-full rounded-full bg-white/10 glassEffect"></div>
            <img
              src={link.icon}
              alt={link.name}
              className={`w-auto h-8 md:h-10 mr-2 lg:mr-4 ${link.iconClassName ?? ''}`}
            />
            <span className="text-sm md:text-lg">{link.name}</span>
          </a>
      ))}
    </div>
  );
};

export default Link;
