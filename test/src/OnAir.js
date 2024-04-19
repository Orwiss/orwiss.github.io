import React from 'react'

export default function OnAir() {
    const projectList = [
        {
            name: '졸업 전시',
            date: '2024.11.20'
        },
        {
            name: '서울 디자인 페스티벌',
            date: '2024.11.13'
        },
        {
            name: '미디어아트 전시',
            date: '2024.06.??'
        },
        {
            name: 'Pagoda: Rate your Goal',
            date: '2024.05.13'
        }
    ]

    return (
        <div>
            <hr style={{marginTop: '30px'}}></hr>
            <h1 style={{marginBottom: '60px'}}>2024 참여 프로젝트</h1>
            {projectList.map((project, index) => (
                <Project project={project} key={index}/>
            ))}
        </div>
    )
}

function Project({project}) {
    return(
        <div>
            <h3>프로젝트명: {project.name}</h3>
            <span>날짜: {project.date}</span>
        </div>
    )
}