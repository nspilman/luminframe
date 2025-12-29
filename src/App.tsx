import { ClientApp } from './ClientApp'
import { ParameterRegistryProvider } from '@/parameters'

function App() {
  return (
    <ParameterRegistryProvider>
      <div className="App">
        <ClientApp />
      </div>
    </ParameterRegistryProvider>
  )
}

export default App
