import React from 'react';

const ReformattedQuery = ({ data }: { data: string }) => {
  return (
    <div style={{width: "100%"}}>
      <h5>Reformatted Query</h5>
      <pre>{data}</pre>
    </div>
  );
};

export default ReformattedQuery;
