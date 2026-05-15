import HomeClient from "./HomeClient";
import { getProjectListData } from "@/lib/projectNotion";
import { mapNotionToProjects } from "@/lib/projectMap";

export default async function Home() {
  const { results } = await getProjectListData();
  const projects = mapNotionToProjects(results);
  return <HomeClient projects={projects} />;
}
