from setuptools import setup

setup(
    name="nexus-cli",
    version="0.1.0",
    description="Multi-model AI CLI tool for humans and agents (Python shim)",
    author="Nexus Team",
    author_email="team@nexus.ai",
    url="https://nexus.ai",
    license="MIT",
    py_modules=["nexus_cli"],
    entry_points={
        "console_scripts": [
            "nexus=nexus_cli:main",
        ],
    },
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Environment :: Console",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Software Development :: Libraries",
    ],
)