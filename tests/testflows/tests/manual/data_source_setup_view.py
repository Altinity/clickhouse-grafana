from requirements.requirements import *
from testflows.core import *
from tests.manual.steps import *


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_ServerAccess("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_BasicAuth("1.0"))
def server_access(self):
    """Check that the Plugin supports server access to clickhouse database."""

    with When("I go to the Altinity plugin page"):
        pass

    with And("I press `Add new data source` button"):
        pass

    with And("I setup connection with server access"):
        open_picture(picture="tests/manual/screenshots/server_access.png")
        pass

    with And("I press 'Save & test' button"):
        pass

    with Then("I check notification is `Data source is working`"):
        pass


@TestScenario
@XFailed("NetworkError when attempting to fetch resource.")
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_HTTPConnection_BrowserAccess("1.0"))
def browser_access(self):
    """Check that the Plugin supports browser access to clickhouse database."""

    with When("I go to the Altinity plugin page"):
        pass

    with And("I press `Add new data source` button"):
        pass

    with And("I setup connection with browser access"):
        open_picture(picture="tests/manual/screenshots/browser_access.png")
        pass

    with And("I press 'Save & test' button"):
        pass

    with Then("I check notification is `Data source is working`"):
        pass


@TestScenario
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_DefaultDataSource("1.0"))
@Okayed("Ok")
def default_datasource(self):
    """Check that default datasource toggle works correctly."""
    with When("I go to the Altinity plugin page"):
        pass

    with And("I press `Add new data source` button"):
        pass

    with And("I setup connection with default toggle on"):
        open_picture(picture="tests/manual/screenshots/default_datasource.png")
        pass

    with And("I press 'Save & test' button"):
        pass

    with Then("I check notification is `Data source is working`"):
        pass

    with When("I go to the datasource page"):
        pass

    with Then("I check datasource is default"):
        open_picture(picture="tests/manual/screenshots/defaulted_datasource.png")


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_TLS_SSLAuthDetails("1.0"))
def ssl_auth(self):
    """Check that the Plugin supports ssl auth."""

    with When("I go to the Altinity plugin page"):
        pass

    with And("I press `Add new data source` button"):
        pass

    with And("I setup connection"):
        with By("specifying Client cert"):
            note("""-----BEGIN RSA PRIVATE KEY-----
            MIIEpAIBAAKCAQEAm8r0Sh0Vi3A9gmRnB0wmzR/aiNmet1oHpjlx3abeHOAlQfpP
            ebA0i0ooRWD2gV1mweMgB64qin7tF27g0KG3mtiYGDSXudEBG0X0Gpb7GqWxKD8u
            4n/ZZQNgecI/26fbKWnz0eKChoE6iuVHrnapGtUYcMgeIifWsWDiQWulWkV0Y3/Z
            PqYCJb9y+RkAQXfsyO/BfhF6rJe6rnuIBYvBxYdXrivKQtJLZleapK2nhCmDYhpa
            WC9Wpvf9Z1wxhP6H1dzn48tjLPE1UD11D2rl/PSd6S5f5jUKDeWP4bZSsuy4hU83
            pN8MofeIYdwt/Db4F8rNtlM5DGtO3M5YV32/cQIDAQABAoIBADx8tw5Tbnr98BPB
            MbNGoMYBeRKrE5Fylge2w/vf/trNOAn+yn6fqDbwauRM+khN4EilC1mQCJpPH3R6
            qzS1pRiswZicStBtUnWpWlY8im/VJwxOQ8DTDK/IeNutTKfW6yOQLIcv36ejYvxs
            esFE9vEhDWU0fWabeyLRT+dAiSmbtK7j0+OdAaaYUHHRWaQ7Q07p5iGJ3XMjgRvG
            Owb9uyPY7V6c4LdJsMDLUwphwuLuzOB5p+ZzwFldsZHcfKQ1OHL/aXFcJQm6IJs7
            VtPcI5KSqD1+d4HlspsFI5ZvhkDZcXyijOPvTCecQfgSnM1a3hTJ3HIv7iBeCgJr
            JSVsRLECgYEAzIH2H6aHKySZogLjyibgY46QqCcAkXdFEqpwjCB15aLXkbxCn32Q
            hfFkmY73eyELndFEP6hsCXD+P19ImL2MP5apKsuxe5BxtZD/LpE1he6aWmYf8kHI
            HvED/qem5I9IP94yFhs1KAZoGAw70TDxR8doGvZebyVtkPqlR+EjLp0CgYEAwwT1
            E8F2Oe/+hJaH1kch8EpOTo7VcOZa7xfmVYPo0NyH+ukGR7GqCs/ZTN3YaHGgte9D
            QutJamV5A3dmZzO0CKO7b5O73xS5bSkyAB1pquHKXUQwSxblgOR7cWDS6CoQe15S
            nAttbQ4CVrS8iMfa1mC+w2kEG7mIx6C7k2OtMeUCgYAS+2Ef8PIM5BnKeuAvzEn5
            k6sDoJMh7WMg52cI6p5m0SWXJlU8vofiltRSmH2KFTghzuG50uUsPyuqMCrp2nYh
            FNfg3AU+Rdr4ElxNMzc3lj0HdQE0GDz9+jr3sRIBlvcKzpHxkVbuvyF8Ue5fbV6H
            3g9gqUt8n4m68jjTIieE1QKBgQCc2xfj0+8rmoS0T/7hskTx6FIjjW7PZ/gr5qU0
            kuxnUXltro+GireiCptU3/p3xyzkKJWI9YYPNZ6n0xliWIuth0Py8nhhbWHXExNM
            VFvxPbpuWbIeM0RU73D6OE5qvaqUD8GSEP7qgCIRaz1ZJqY1V4sX0Rek1Q3Wwskc
            O0fKoQKBgQCvLt2r8MjFbTbfAWoRC6auY8HWUrO1K/LN1TpbY0lt673MYPCpC+7o
            NDH4Rxtg5KAm0dUM/Isj2P0l6NFSZQPWNGB2Qtpvv6ueEFtI/0nAWNoz2fD0Zjiy
            bMKsoc77KjAYHczwlKjJCARh6DBfk6Iw01Q1CewuVz1p6NcJs0duog==
            -----END RSA PRIVATE KEY-----""")

        with By("specifying Client Key"):
            note("""-----BEGIN CERTIFICATE-----
            MIIC0TCCAbmgAwIBAgIUKkAnyhTi7fbhHyu1pBrTGa4jBwgwDQYJKoZIhvcNAQEL
            BQAwEzERMA8GA1UECgwIYWx0aW5pdHkwIBcNMjExMTE3MDIyNTIxWhgPMzAyMTAz
            MjAwMjI1MjFaMBUxEzARBgNVBAMMCmNsaWNraG91c2UwggEiMA0GCSqGSIb3DQEB
            AQUAA4IBDwAwggEKAoIBAQCbyvRKHRWLcD2CZGcHTCbNH9qI2Z63WgemOXHdpt4c
            4CVB+k95sDSLSihFYPaBXWbB4yAHriqKfu0XbuDQobea2JgYNJe50QEbRfQalvsa
            pbEoPy7if9llA2B5wj/bp9spafPR4oKGgTqK5Ueudqka1RhwyB4iJ9axYOJBa6Va
            RXRjf9k+pgIlv3L5GQBBd+zI78F+EXqsl7que4gFi8HFh1euK8pC0ktmV5qkraeE
            KYNiGlpYL1am9/1nXDGE/ofV3Ofjy2Ms8TVQPXUPauX89J3pLl/mNQoN5Y/htlKy
            7LiFTzek3wyh94hh3C38NvgXys22UzkMa07czlhXfb9xAgMBAAGjGTAXMBUGA1Ud
            EQQOMAyCCmNsaWNraG91c2UwDQYJKoZIhvcNAQELBQADggEBAE2Bcu2mIAfD6NGp
            TMoxdElg6q1PqGJxiqmp9d/fJaQG/VyDCJbpXr8JBcwCGf3JaLxjpr7evbDArlV2
            V9wc195koA2jGfPWo29csHwjxUgjuRupUTJKBrKalenr+4rHvgjsyMw/7U8Nm3yb
            2dkk3J9qk301mU+tkJY1EAyy+ybizH/xpNRlmbbwdCnWsGkR1+FxFt35ZS29YBXd
            sAheWL3B2qsraMdb3UhplYyz98KWjAm0+Ub/S4xtQ88c29zornjJhf+g6VTP6ndL
            WsZoX7mQ7elvXcoUBmqFPeGRQUe3CF40KbkTVszu7E74230bOewTeF6wN5+DzaU6
            Pycb0O8=
            -----END CERTIFICATE-----""")
        open_picture(picture="tests/manual/screenshots/ssl_auth.png")
        pass

    with And("I press 'Save & test' button"):
        pass

    with Then("I check notification is `Data source is working`"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_Auth_WithCACert("1.0"))
def ca_cert(self):
    """Check that the Plugin supports defining ca cert."""

    with When("I go to the Altinity plugin page"):
        pass

    with And("I press `Add new data source` button"):
        pass

    with And("I setup connection"):
        note("""-----BEGIN CERTIFICATE-----
        MIIDCTCCAfGgAwIBAgIUOKBEcvQ9P7ljP5fH3yX1TxeFwMwwDQYJKoZIhvcNAQEL
        BQAwEzERMA8GA1UECgwIYWx0aW5pdHkwIBcNMjExMTE3MDIyNDAzWhgPMzAyMTAz
        MjAwMjI0MDNaMBMxETAPBgNVBAoMCGFsdGluaXR5MIIBIjANBgkqhkiG9w0BAQEF
        AAOCAQ8AMIIBCgKCAQEAsuSCndC3zNSJzul/S3ORMChfASKcxEp11lVfOJMsL5Wp
        mMlq/DNdIhPS/yWoObOUB1tKD3Vv1bZMdeXYsaK3MDWMEc0BpROcoqcimqJPRILx
        EhKuCP070wL03E3EyYHc9RndGWS63G6PJXXpY6uUsZSnvE58XV1Xsz2lEk9igfbU
        BJovblXuMEiiqFP1AuRo+KTpvpR6u4nKJFGL+ds/deZ14CfRPzJa4f/dZzFXCfZA
        bmzi4OcixUL8P8uIUl04QoXmLoWPO0oXVjar8PJcAuP+Sf5uJj0bP52juTP8MM58
        +KtyBlfaY0bPKQ5WwMRmfquj2MX0b3DQTUeSn6ZAtwIDAQABo1MwUTAdBgNVHQ4E
        FgQUGhNxaqo7JyJhLUIN9HGT8gj+hR4wHwYDVR0jBBgwFoAUGhNxaqo7JyJhLUIN
        9HGT8gj+hR4wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEACEVL
        FSfOGQIckHnoqXfOBKwzmYBlydAI6Ttp8xrCQ6cC9+xqQj1PpTg8t2Mb6xvDrjTt
        uKrv6aaBCxkU8DtQW5iNc9DnY4BG33unNDjDMAWV2AomOI/KiXGP/0ZOJE1uzE+6
        fyCagl787FoRD1pVXrdAKFYQQE7GkjHXcJGZZ3uE/+dbcCEtnzFavUfdss9LdvuT
        nBhnFiojDaZSDzRJuj3OHqWjv5ZMv0ZzQGV4AxFq7aHyYOfD+HBn81uM8vKwk1qD
        ltWDeOyu/vPJypKdCveiOD9nUxtijmQKEjlUHZlGzL6isX0rPZV2rxFER5bCrslx
        t0iuvjfkwB8qlIBh7A==
        -----END CERTIFICATE-----""")
        open_picture(picture="tests/manual/screenshots/ca_cert.png")
        pass

    with And("I press 'Save & test' button"):
        pass

    with Then("I check notification is `Data source is working`"):
        pass


@TestScenario
@Okayed("Ok")
@Requirements(RQ_SRS_Plugin_DataSourceSetupView_BasicAuth("1.0"))
def remote_clickhouse(self):
    """Check that the plugin supports connecting to the remote clickhouse server."""

    with Given("I create cluster on https://acm.dev.altinity.cloud"):
        pass

    with When("I go to the Altinity plugin page"):
        pass

    with And("I press `Add new data source` button"):
        pass

    with And("I setup connection"):
        open_picture(picture="tests/manual/screenshots/remote_clickhouse.png")
        pass

    with And("I press 'Save & test' button"):
        pass

    with Then("I check notification is `Data source is working`"):
        pass


@TestFeature
@Requirements(RQ_SRS_Plugin_DataSourceSetupView("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_SaveAndTestButton("1.0"),
              RQ_SRS_Plugin_DataSourceSetupView_DataSourceName("1.0"))
@Name("data source setup view")
def feature(self):
    """Check that Plugin support data source setup view."""

    for scenario in loads(current_module(), Scenario):
        scenario()
