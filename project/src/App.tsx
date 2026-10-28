import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Body } from './pages/Body';
import { History } from './pages/History';
import { Progress } from './pages/Progress';
import { Workout } from './pages/Workout';

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Workout />} />
          <Route path="history" element={<History />} />
          <Route path="progress" element={<Progress />} />
          <Route path="body" element={<Body />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
