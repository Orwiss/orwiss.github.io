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
    icon: 'https://cdn-icons-png.flaticon.com/512/25/25231.png',
    url: 'https://github.com/Orwiss',
  },
];

const Link = () => {
  return (
    <div className="z-40 flex flex-col items-center justify-center min-h-screen">
      {links.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-full w-[clamp(200px,40%,360px)] h-20 text-black text-lg font-bold my-8 text-center shadow-lg transition-transform transform hover:translate-y-[-4px] hover:shadow-2xl active:text-black pointer-events-auto"
        >
          <img
            src={link.icon}
            alt={link.name}
            className="w-auto h-10 mr-2"
          />
          <span>{link.name}</span>
        </a>
      ))}
    </div>
  );
};

export default Link;
