import React from 'react';

type LinkType = {
  name: string;
  icon: string;
  url: string;
};

const links: LinkType[] = [
  {
    name: 'Instagram',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/768px-Instagram_icon.png',
    url: 'https://www.instagram.com/dv5e1n',
  },
  {
    name: 'OpenProcessing',
    icon: 'https://openprocessing.org/assets/img/logo/logo_36x30_color@2x.png',
    url: 'https://openprocessing.org/user/280258',
  },
  {
    name: 'GitHub',
    icon: 'https://images.icon-icons.com/3685/PNG/512/github_logo_icon_229278.png',
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
          >
            <div className="absolute w-full h-full rounded-full bg-white/10 glassEffect"></div>
            <img
              src={link.icon}
              alt={link.name}
              className="w-auto h-8 md:h-10 mr-2 lg:mr-4"
            />
            <span className="text-sm md:text-lg">{link.name}</span>
          </a>
      ))}
    </div>
  );
};

export default Link;
