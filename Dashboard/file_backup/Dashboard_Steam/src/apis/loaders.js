export const apiTitle = () => {
    return fetch('https://jsonplaceholder.typicode.com/posts');
};

export const apiData = ({params}) => {
    return fetch(`https://jsonplaceholder.typicode.com/posts/${params.id}`)
}

// src/apis/loaders.js
export const fetchTemperatureData = async () => {
    const response = await fetch('https://dummyjson.com/c/82ea-34b2-47f6-8f39'); // Replace with actual API
    const data = await response.json();
    return data;
  };
  
  export const fetchPressureData = async () => {
    const response = await fetch('https://dummyjson.com/c/863a-44fa-4fd8-abf2'); // Replace with actual API
    const data = await response.json();
    return data;
  };
  
  export const fetchFlowData = async () => {
    const response = await fetch('https://dummyjson.com/c/b07a-ce16-49fb-959f'); // Replace with actual API
    const data = await response.json();
    return data;
  };
  
  export const fetchEnergyData = async () => {
    const response = await fetch('https://dummyjson.com/c/4807-132a-4685-a371'); // Replace with actual API
    const data = await response.json();
    return data;
  };

  export const randomData = async () => {
    const response = await fetch('https//backend-agustrisa.pitunnel.nethttp://localhost:9921/api/random-data');
    const data = await response.json();
    return data;
  };
  