import axios from 'axios'

const baseUrl = '/api/persons'

const getAll = async (signal) => {
  const response = await axios.get(baseUrl, { signal })
  return response.data
}

const create = async (newObject, signal) => {
  const response = await axios.post(baseUrl, newObject, { signal })
  return response.data
}

const remove = async (id, signal) => {
  await axios.delete(`${baseUrl}/${id}`, { signal })
}

export default { getAll, create, remove }
