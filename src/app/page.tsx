import { getLibraryData } from './actions';
import ClientPage from './ClientPage';

export default async function Home() {
  const { layout, entries } = await getLibraryData();

  return <ClientPage initialLayout={layout} initialEntries={entries} />;
}
