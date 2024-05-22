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
        },
        {
            name: 'Open Mine',
            date: '2024.03.11'
        },
        {
            name: 'Pagoda',
            date: '2024.03.04'
        }
    ]

    return (
        <div>
            <hr style={{marginTop: '30px'}}></hr>
            <h1 style={{marginBottom: '60px'}}>2024 참여 프로젝트</h1>
            <div style={{columnCount: '2'}}>
                {projectList.map((project, index) => (
                    <Project project={project} key={index}/>
                ))}
            </div>
        </div>
    )
}

function Project({project}) {
    const itemStyle = {
        display: 'inline-block',
        padding: '30px',
        margin: '10px 0',
        border: '1px solid black',
        borderRadius: '24pt'
    }

    return(
        <div style={{display: 'grid', placeItems: 'center'}}>
            <div style={itemStyle}>
                <h3 style={{margin: '2px 0'}}>{project.name}</h3>
                <span>날짜: {project.date}</span>
            </div>
        </div>
    )
}