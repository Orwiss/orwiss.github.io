import React from 'react';
import styled from 'styled-components';

const links = [
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

const Button = styled.a`
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(12px);
    border-radius: 80px;
    width: clamp(200px, 40%, 360px);
    height: 80px;
    text-decoration: none;
    color: black;
    font-size: 18pt;
    font-weight: bold;
    margin: 30px;
    text-align: center;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    z-index: 10;

    &:hover {
        transform: translateY(-4px);
        box-shadow: 0px 8px 12px rgba(0, 0, 0, 0.2);
    }

    &:active, &:visited {
        color: black;
    }

    span {
        margin-left: 10px;
    }

    img {
        width: auto;  /* 아이콘 크기를 40px로 설정 */
        height: 40px; /* 아이콘 크기를 40px로 설정 */
        margin-right: 10px; /* 텍스트와 아이콘 간의 간격 */
    }
`;

const linkBox = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    flexDirection: 'column',
    zIndex: '10',
    pointerEvents: 'auto'
}

const Link = () => {
    return (
        <div style={linkBox}>
        {links.map((link) => (
            <Button key={link.name} href={link.url} target="_blank">
                <img src={link.icon} alt={link.name} />
                <span>{link.name}</span>
            </Button>
        ))}
        </div>
    );
};

export default Link;
