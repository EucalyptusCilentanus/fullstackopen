import { useEffect, useRef, useState } from 'react'
import Filter from './components/Filter'
import PersonForm from './components/PersonForm'
import Persons from './components/Persons'
import Notification from './components/Notification'
import personsService from './services/persons'

const normalizeText = (text) => text.trim().toLowerCase()
const sameId = (a, b) => String(a) === String(b)
const toId = (id) => String(id)

const getHttpStatus = (error) => {
  if (!error || typeof error !== 'object') return null
  if (error.response && typeof error.response.status === 'number') return error.response.status
  return null
}

const getServerErrorMessage = (error) => {
  const msg = error?.response?.data?.error
  return typeof msg === 'string' && msg.trim().length > 0 ? msg.trim() : null
}

const isAxiosCanceled = (error) => {
  return (
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.message === 'canceled'
  )
}

const App = () => {
  const [persons, setPersons] = useState([])
  const [newName, setNewName] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [filter, setFilter] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [notification, setNotification] = useState({ message: null, type: null })

  const notificationTimeoutRef = useRef(null)

  const inFlightRef = useRef({
    create: false,
    deleteIds: new Set(),
  })

  const showNotification = (message, type) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }

    setNotification({ message, type })

    notificationTimeoutRef.current = setTimeout(() => {
      setNotification({ message: null, type: null })
      notificationTimeoutRef.current = null
    }, 5000)
  }

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    const fetchPersons = async () => {
      try {
        const initialPersons = await personsService.getAll(controller.signal)
        if (!active || controller.signal.aborted) return
        setPersons(initialPersons)
      } catch (error) {
        if (!active || controller.signal.aborted || isAxiosCanceled(error)) return
        console.error('Failed to fetch persons from server:', error)
        showNotification(
          'Failed to load persons. Make sure the backend is running on port 3001.',
          'error'
        )
      } finally {
        if (active && !controller.signal.aborted) {
          setIsInitialLoading(false)
        }
      }
    }

    fetchPersons()

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const handleNameChange = (event) => setNewName(event.target.value)
  const handleNumberChange = (event) => setNewNumber(event.target.value)
  const handleFilterChange = (event) => setFilter(event.target.value)

  const addPerson = async (event) => {
    event.preventDefault()

    if (isInitialLoading) {
      showNotification('Please wait, loading phonebook data...', 'error')
      return
    }

    const name = newName.trim()
    const number = newNumber.trim()

    if (name.length === 0 || number.length === 0) {
      return
    }

    const normalizedNewName = normalizeText(name)
    const existingPerson = persons.find((person) => normalizeText(person.name) === normalizedNewName)

    // Step 3.9: niente update numero ancora -> blocca i duplicati
    if (existingPerson) {
      window.alert(`${existingPerson.name} is already added to phonebook`)
      return
    }

    if (inFlightRef.current.create) return
    inFlightRef.current.create = true

    try {
      const createdPerson = await personsService.create({ name, number })
      setPersons((prev) => prev.concat(createdPerson))
      showNotification(`Added ${createdPerson.name}`, 'success')
      setNewName('')
      setNewNumber('')
    } catch (error) {
      console.error('Failed to create person on server:', error)
      const status = getHttpStatus(error)
      const serverMsg = getServerErrorMessage(error)

      if (status === 400 && serverMsg) {
        showNotification(serverMsg, 'error')
      } else {
        showNotification(
          'Failed to save the person. Make sure the backend is running on port 3001.',
          'error'
        )
      }
    } finally {
      inFlightRef.current.create = false
    }
  }

  const handleDeletePerson = async (person) => {
    if (isInitialLoading) {
      showNotification('Please wait, loading phonebook data...', 'error')
      return
    }

    const idStr = toId(person.id)

    if (inFlightRef.current.deleteIds.has(idStr)) return

    const ok = window.confirm(`Delete ${person.name} ?`)
    if (!ok) return

    inFlightRef.current.deleteIds.add(idStr)

    try {
      await personsService.remove(person.id)
      setPersons((prev) => prev.filter((p) => !sameId(p.id, person.id)))
    } catch (error) {
      console.error('Failed to delete person on server:', error)
      const status = getHttpStatus(error)

      if (status === 404) {
        showNotification(`Information of ${person.name} has already been removed from server`, 'error')
        setPersons((prev) => prev.filter((p) => !sameId(p.id, person.id)))
      } else {
        showNotification(
          `Failed to delete ${person.name}. Make sure the backend is running.`,
          'error'
        )
      }
    } finally {
      inFlightRef.current.deleteIds.delete(idStr)
    }
  }

  const normalizedFilter = normalizeText(filter)
  const personsToShow =
    normalizedFilter.length === 0
      ? persons
      : persons.filter((p) => normalizeText(p.name).includes(normalizedFilter))

  return (
    <div>
      <h2>Phonebook</h2>

      <Notification message={notification.message} type={notification.type} />
      <Filter filter={filter} onFilterChange={handleFilterChange} />

      <h3>Add a new</h3>
      <PersonForm
        onSubmit={addPerson}
        newName={newName}
        onNameChange={handleNameChange}
        newNumber={newNumber}
        onNumberChange={handleNumberChange}
      />

      <h3>Numbers</h3>
      <Persons persons={personsToShow} onDelete={handleDeletePerson} />
    </div>
  )
}

export default App
