# Running Altinity grafana plugin testflows tests locally

1. Install docker-compose.
2. Install required python packages:
  `pip install -r tests/testflows/requirements.txt`
3. Stop applications that use the following ports:
   - 8123, 9000, 5432, 3306, 3000, 3001, 8480, 4444
3. Go into testflows/test directory
4. Run regression.py
  `./regression.py`
  
# Useful options
  The following options can be useful:
    `--before=0.5 --after=0.5` - delay before and after steps.

# Watching running tests
  You can check running tests on `localhost:4444` password=secret
