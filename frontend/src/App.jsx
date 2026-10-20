import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Fuel from './pages/Fuel';
import Trips from './pages/Trips';
import TripDetail from './pages/TripDetail';
import Clients from './pages/Clients';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Conductors from './pages/Conductors';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Receipts from './pages/Receipts';
import ReceiptDetail from './pages/ReceiptDetail';
import Settings from './pages/Settings';
import StaffPayments from './pages/StaffPayments';
import StaffDetail from './pages/StaffDetail';
import VehicleDetail from './pages/VehicleDetail';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/receipts/:id" element={<ReceiptDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/drivers/:id" element={<StaffDetail staffType="driver" />} />
          <Route path="/conductors" element={<Conductors />} />
          <Route path="/conductors/:id" element={<StaffDetail staffType="conductor" />} />
          <Route path="/staff-payments" element={<StaffPayments />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/fuel" element={<Fuel />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}