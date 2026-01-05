import {useState, useEffect} from 'react';
import {propertySearchService} from '../services/propertySearch.service';

export const useProperties = (query?: string) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      setLoading(true);
      propertySearchService.search(query).then(data => {
        setProperties(data);
        setLoading(false);
      });
    }
  }, [query]);

  return {properties, loading};
};

